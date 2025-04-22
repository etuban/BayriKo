import { Request, Response } from 'express';
import { storage } from '../storage';
import { randomBytes } from 'crypto';
import { insertInvitationLinkSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';

/**
 * Generate a unique token for invitation links
 */
function generateInvitationToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Create a new invitation link
 */
export const createInvitationLink = async (req: Request, res: Response) => {
  try {
    // Verify user is authorized (must be super_admin or supervisor)
    if (req.user?.role !== 'super_admin' && req.user?.role !== 'supervisor') {
      return res.status(403).json({
        message: 'Forbidden: Only super_admin and supervisor roles can create invitation links'
      });
    }
    
    // Validate request body
    const linkData = insertInvitationLinkSchema.parse({
      ...req.body,
      createdById: req.user.id,
      token: generateInvitationToken()
    });
    
    // If user is not super_admin, verify they belong to this organization
    if (req.user?.role !== 'super_admin') {
      const orgUser = await storage.getUserRoleInOrganization(req.user.id, linkData.organizationId);
      if (!orgUser) {
        return res.status(403).json({
          message: 'Forbidden: You can only create invitation links for organizations you belong to'
        });
      }
    }
    
    // Set defaults for optional fields
    if (!linkData.expires) {
      // Default expiration is 7 days
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 7);
      linkData.expires = expiration;
    }
    
    if (!linkData.maxUses) {
      // Default to 10 uses
      linkData.maxUses = 10;
    }
    
    // Create the invitation link
    const invitationLink = await storage.createInvitationLink(linkData);
    
    // Generate the full invitation URL
    const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
    const invitationUrl = `${baseUrl}/register?token=${invitationLink.token}`;
    
    res.status(201).json({
      ...invitationLink,
      invitationUrl
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: formatZodError(error) 
      });
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
    const organizationId = parseInt(req.params.id);
    
    // If user is not super_admin, verify they belong to this organization
    if (req.user?.role !== 'super_admin') {
      const orgUser = await storage.getUserRoleInOrganization(req.user?.id || 0, organizationId);
      if (!orgUser || (orgUser !== 'supervisor' && orgUser !== 'team_lead')) {
        return res.status(403).json({
          message: 'Forbidden: You can only view invitation links for organizations you manage'
        });
      }
    }
    
    const links = await storage.getInvitationLinksByOrganization(organizationId);
    
    // Generate the full invitation URLs
    const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
    const linksWithUrls = links.map(link => ({
      ...link,
      invitationUrl: `${baseUrl}/register?token=${link.token}`
    }));
    
    res.status(200).json(linksWithUrls);
  } catch (error) {
    console.error('Error getting invitation links:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete an invitation link
 */
export const deleteInvitationLink = async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.id);
    
    // Get the invitation link
    const link = await db.select().from(invitationLinks).where(eq(invitationLinks.id, linkId)).limit(1);
    if (!link || link.length === 0) {
      return res.status(404).json({ message: 'Invitation link not found' });
    }
    
    // If user is not super_admin, verify they are the creator or a supervisor in this organization
    if (req.user?.role !== 'super_admin') {
      const isCreator = link[0].createdById === req.user?.id;
      const orgUser = await storage.getUserRoleInOrganization(req.user?.id || 0, link[0].organizationId);
      
      if (!isCreator && (!orgUser || orgUser !== 'supervisor')) {
        return res.status(403).json({
          message: 'Forbidden: You can only delete invitation links you created or for organizations you supervise'
        });
      }
    }
    
    // Delete the invitation link
    await storage.deleteInvitationLink(linkId);
    
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
    const { token } = req.params;
    
    // Find the invitation link
    const link = await storage.getInvitationLinkByToken(token);
    
    if (!link) {
      return res.status(404).json({ 
        valid: false,
        message: 'Invalid invitation link' 
      });
    }
    
    // Check if the link is active
    if (!link.active) {
      return res.status(400).json({ 
        valid: false,
        message: 'This invitation link has been deactivated' 
      });
    }
    
    // Check if the link has expired
    if (link.expires && new Date() > link.expires) {
      return res.status(400).json({ 
        valid: false,
        message: 'This invitation link has expired' 
      });
    }
    
    // Check if the link has reached max uses
    if (link.maxUses && link.usedCount >= link.maxUses) {
      return res.status(400).json({ 
        valid: false,
        message: 'This invitation link has reached its maximum uses' 
      });
    }
    
    // Get the organization info
    const organization = await storage.getOrganizationById(link.organizationId);
    
    if (!organization) {
      return res.status(404).json({ 
        valid: false,
        message: 'The associated organization does not exist' 
      });
    }
    
    // Return success with organization info and assigned role
    res.status(200).json({
      valid: true,
      organization: {
        id: organization.id,
        name: organization.name
      },
      role: link.role
    });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Internal server error' 
    });
  }
};

/**
 * Use an invitation link (increments usage count)
 */
export const useInvitationLink = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find the invitation link
    const link = await storage.getInvitationLinkByToken(token);
    
    if (!link) {
      return res.status(404).json({ message: 'Invalid invitation link' });
    }
    
    // Increment the usage count
    await storage.incrementInvitationLinkUsage(link.id);
    
    res.status(200).json({ message: 'Invitation link used successfully' });
  } catch (error) {
    console.error('Error using invitation link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};