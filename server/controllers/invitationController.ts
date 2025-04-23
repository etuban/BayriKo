import { Request, Response } from 'express';
import { storage } from '../storage';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';
import { insertInvitationLinkSchema, User } from '@shared/schema';
import { randomBytes } from 'crypto';
import { sendInvitationEmail } from '../utils/emailService';

/**
 * Generate a unique token for invitation links
 */
function generateInvitationToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create a new invitation link
 */
export const createInvitationLink = async (req: Request, res: Response) => {
  try {
    // Detailed logging for debugging
    console.log('CREATE INVITATION LINK REQUEST:');
    console.log('- User authenticated:', req.isAuthenticated());
    console.log('- User role:', req.user?.role);
    console.log('- User ID:', req.user?.id);
    console.log('- User currentOrganizationId:', (req.user as any)?.currentOrganizationId);
    console.log('- Request body:', JSON.stringify(req.body));
    
    // Only supervisors and super_admins can create invitation links
    const user = req.user;
    if (!user || (user.role !== 'supervisor' && user.role !== 'super_admin')) {
      console.log('FORBIDDEN: User not authorized to create invitations');
      return res.status(403).json({ message: 'Forbidden: Only supervisors and super admins can create invitation links' });
    }
    
    // Get the organization ID from the request
    const { organizationId, role, expires, maxUses, message } = req.body;
    
    if (!organizationId) {
      console.log('BAD REQUEST: Missing organizationId in request body');
      return res.status(400).json({ message: 'Missing organizationId in request' });
    }
    
    console.log(`Validating user ${user.id} for organization ${organizationId}`);
    
    // Validate if the user is part of the organization
    if (user.role !== 'super_admin') {
      const userRole = await storage.getUserRoleInOrganization(user.id, organizationId);
      console.log('User role in organization:', userRole);
      
      if (!userRole || userRole !== 'supervisor') {
        console.log('FORBIDDEN: User is not a supervisor of this organization');
        return res.status(403).json({ message: 'Forbidden: You are not a supervisor of this organization' });
      }
    }
    
    // Generate a unique token
    const token = generateInvitationToken();
    console.log('Generated invitation token:', token);
    
    // Create the invitation link
    const invitationData = {
      organizationId,
      token,
      role: role || 'staff',
      message: message || `You've been invited to join our organization.`,
      active: true,
      expires: expires ? new Date(expires) : null,
      maxUses: maxUses || null,
      createdById: user.id
    };
    
    console.log('Invitation data to be saved:', JSON.stringify(invitationData));
    
    // Validate the invitation data against the schema
    const parsedData = insertInvitationLinkSchema.parse(invitationData);
    
    // Create the invitation link
    const invitationLink = await storage.createInvitationLink(parsedData);
    console.log('Invitation link created:', JSON.stringify(invitationLink));
    
    // Send email if sendEmail is true and recipientEmail is provided
    if (req.body.sendEmail && req.body.recipientEmail) {
      try {
        // Get the organization details
        const organization = await storage.getOrganizationById(organizationId);
        if (!organization) {
          console.error('Organization not found for sending invitation email');
        } else {
          console.log(`Sending invitation email to: ${req.body.recipientEmail}`);
          // Extract only the necessary user fields to avoid type errors
          const senderInfo = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName || '',
            role: user.role,
            password: '', // Add required fields with empty values
            createdAt: new Date(),
            avatarUrl: null,
            position: null,
            isApproved: true,
            isSuperAdmin: user.role === 'super_admin',
            firebaseUid: null
          };
          
          const emailSent = await sendInvitationEmail(
            req.body.recipientEmail,
            invitationLink,
            organization,
            senderInfo as User // Pass sender details with type cast
          );
          console.log('Invitation email sent:', emailSent);
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't fail the request if email sending fails
      }
    }
    
    // Return the invitation link
    res.status(201).json(invitationLink);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: formatZodError(error) });
    }
    
    console.error('Error creating invitation link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all invitation links for an organization
 */
export const getOrganizationInvitationLinks = async (req: Request, res: Response) => {
  try {
    // The route parameter is 'id', not 'organizationId'
    const organizationId = parseInt(req.params.id);
    
    if (isNaN(organizationId)) {
      console.error(`Invalid organization ID: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid organization ID' });
    }
    
    console.log(`Getting invitation links for organization ID: ${organizationId}`);
    
    // Check if the user has permission to view invitation links for this organization
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // For non-super-admins, check if they are part of the organization
    if (user.role !== 'super_admin') {
      const userRole = await storage.getUserRoleInOrganization(user.id, organizationId);
      if (!userRole || (userRole !== 'supervisor' && userRole !== 'team_lead')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to view invitation links for this organization' });
      }
    }
    
    // Get the invitation links
    const invitationLinks = await storage.getInvitationLinksByOrganization(organizationId);
    
    // Return the invitation links
    res.status(200).json(invitationLinks);
  } catch (error) {
    console.error('Error getting organization invitation links:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete an invitation link
 */
export const deleteInvitationLink = async (req: Request, res: Response) => {
  try {
    const invitationId = parseInt(req.params.id);
    
    // Get the invitation link
    const invitationLink = await storage.getInvitationLinkById(invitationId);
    if (!invitationLink) {
      return res.status(404).json({ message: 'Invitation link not found' });
    }
    
    // Check if the user has permission to delete this invitation link
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // For non-super-admins, check if they are the creator or a supervisor of the organization
    if (user.role !== 'super_admin' && invitationLink.createdById !== user.id) {
      const userRole = await storage.getUserRoleInOrganization(user.id, invitationLink.organizationId);
      if (!userRole || userRole !== 'supervisor') {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this invitation link' });
      }
    }
    
    // Delete the invitation link
    await storage.deleteInvitationLink(invitationId);
    
    // Return success
    res.status(200).json({ message: 'Invitation link deleted successfully' });
  } catch (error) {
    console.error('Error deleting invitation link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Validate an invitation token
 */
export const validateInvitationToken = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    
    // Get the invitation link
    const invitationLink = await storage.getInvitationLinkByToken(token);
    if (!invitationLink) {
      return res.status(404).json({ valid: false, message: 'Invitation link not found' });
    }
    
    // Check if the invitation link is active
    if (!invitationLink.active) {
      return res.status(400).json({ valid: false, message: 'This invitation link has been deactivated' });
    }
    
    // Check if the invitation link has expired
    if (invitationLink.expires && new Date() > invitationLink.expires) {
      return res.status(400).json({ valid: false, message: 'This invitation link has expired' });
    }
    
    // Check if the invitation link has reached its maximum uses
    if (invitationLink.maxUses && invitationLink.usedCount >= invitationLink.maxUses) {
      return res.status(400).json({ valid: false, message: 'This invitation link has reached its maximum uses' });
    }
    
    // Get the organization name
    const organization = await storage.getOrganizationById(invitationLink.organizationId);
    if (!organization) {
      return res.status(404).json({ valid: false, message: 'Organization not found' });
    }
    
    // Return success
    res.status(200).json({
      valid: true,
      token: invitationLink.token,
      organization: {
        id: organization.id,
        name: organization.name
      },
      role: invitationLink.role,
      message: invitationLink.message,
      expires: invitationLink.expires,
      maxUses: invitationLink.maxUses,
      usedCount: invitationLink.usedCount
    });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    res.status(500).json({ valid: false, message: 'Internal server error' });
  }
};

/**
 * Use an invitation link (increments usage count)
 */
export const useInvitationLink = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    
    // Get the invitation link
    const invitationLink = await storage.getInvitationLinkByToken(token);
    if (!invitationLink) {
      return res.status(404).json({ message: 'Invitation link not found' });
    }
    
    // Check if the invitation link is active
    if (!invitationLink.active) {
      return res.status(400).json({ message: 'This invitation link has been deactivated' });
    }
    
    // Check if the invitation link has expired
    if (invitationLink.expires && new Date() > invitationLink.expires) {
      return res.status(400).json({ message: 'This invitation link has expired' });
    }
    
    // Check if the invitation link has reached its maximum uses
    if (invitationLink.maxUses && invitationLink.usedCount >= invitationLink.maxUses) {
      return res.status(400).json({ message: 'This invitation link has reached its maximum uses' });
    }
    
    // Increment the usage count
    await storage.incrementInvitationLinkUsage(invitationLink.id);
    
    // Return success
    res.status(200).json({ message: 'Invitation link used successfully' });
  } catch (error) {
    console.error('Error using invitation link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send invitation email for an existing invitation link
 */
export const sendExistingInvitationEmail = async (req: Request, res: Response) => {
  try {
    const { token, recipientEmail, organizationId } = req.body;
    
    if (!token || !recipientEmail || !organizationId) {
      return res.status(400).json({ message: 'Missing required fields: token, recipientEmail, or organizationId' });
    }
    
    // Get the invitation link
    const invitationLink = await storage.getInvitationLinkByToken(token);
    if (!invitationLink) {
      return res.status(404).json({ message: 'Invitation link not found' });
    }
    
    // Validate if the user has permission to send email for this organization
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // For non-super-admins, check if they are part of the organization
    if (user.role !== 'super_admin') {
      const userRole = await storage.getUserRoleInOrganization(user.id, organizationId);
      if (!userRole || (userRole !== 'supervisor' && userRole !== 'team_lead')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to send invitation emails for this organization' });
      }
    }
    
    // Get the organization details
    const organization = await storage.getOrganizationById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Extract only the necessary user fields to avoid type errors
    const senderInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName || '',
      role: user.role,
      password: '', // Add required fields with empty values
      createdAt: new Date(),
      avatarUrl: null,
      position: null,
      isApproved: true,
      isSuperAdmin: user.role === 'super_admin',
      firebaseUid: null
    };
    
    // Send the invitation email
    const emailSent = await sendInvitationEmail(
      recipientEmail,
      invitationLink,
      organization,
      senderInfo as User
    );
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send invitation email' });
    }
    
    // Return success
    res.status(200).json({ message: 'Invitation email sent successfully' });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};