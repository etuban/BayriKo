import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertOrganizationSchema, Organization } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';

export const getAllOrganizations = async (req: Request, res: Response) => {
  try {
    // Super admins can see all organizations
    // Other roles can only see their own organizations
    let organizations: Organization[];
    
    if (req.user?.role === 'super_admin') {
      organizations = await storage.getAllOrganizations();
    } else {
      // Get organizations the user belongs to
      organizations = await storage.getOrganizationsForUser(req.user?.id || 0);
    }
    
    // Get additional counts for each organization
    const organizationsWithCounts = await Promise.all(organizations.map(async (org) => {
      // Get user count
      const users = await storage.getOrganizationUsers(org.id);
      
      // Get project count
      const projects = await storage.getProjectsForOrganization(org.id);
      
      return {
        ...org,
        userCount: users.length,
        projectCount: projects.length
      };
    }));
    
    res.status(200).json(organizationsWithCounts);
  } catch (error) {
    console.error('Error getting organizations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const organization = await storage.getOrganizationById(orgId);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Get user count
    const users = await storage.getOrganizationUsers(orgId);
    
    // Get project count
    const projects = await storage.getProjectsForOrganization(orgId);
    
    res.status(200).json({
      ...organization,
      userCount: users.length,
      projectCount: projects.length
    });
  } catch (error) {
    console.error('Error getting organization:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createOrganization = async (req: Request, res: Response) => {
  try {
    // Only super_admin and supervisor can create organizations
    if (req.user?.role !== 'super_admin' && req.user?.role !== 'supervisor') {
      return res.status(403).json({ message: 'Forbidden: Only super_admin and supervisor can create organizations' });
    }
    
    // Validate request body
    const organizationData = insertOrganizationSchema.parse(req.body);
    
    // Create the organization
    const newOrganization = await storage.createOrganization(organizationData);
    
    // Add the current user to the organization if they're not a super_admin (super_admin is already part of all orgs)
    if (req.user?.role !== 'super_admin') {
      await storage.addUserToOrganization(req.user?.id || 0, newOrganization.id, req.user?.role || 'supervisor');
    }
    
    // Get admin user's email (super admin)
    const superAdminEmail = await storage.getSuperAdminEmail();
    
    // Create notification for super admin
    if (superAdminEmail && req.user?.id) {
      // This is a placeholder for notification logic
      // You can implement this when you add notifications for organizations
    }
    
    res.status(201).json(newOrganization);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: formatZodError(error) });
    }
    
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateOrganization = async (req: Request, res: Response) => {
  try {
    // Only super_admin and supervisor can update organizations
    if (req.user?.role !== 'super_admin' && req.user?.role !== 'supervisor') {
      return res.status(403).json({ message: 'Forbidden: Only super_admin and supervisor can update organizations' });
    }
    
    const orgId = parseInt(req.params.id);
    const organization = await storage.getOrganizationById(orgId);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Non-super admins can only update their own organizations
    if (req.user?.role !== 'super_admin') {
      const userOrgs = await storage.getOrganizationsForUser(req.user?.id || 0);
      const userOrgIds = userOrgs.map(org => org.id);
      
      if (!userOrgIds.includes(orgId)) {
        return res.status(403).json({ message: 'Forbidden: You can only update organizations you belong to' });
      }
    }
    
    // Update only allowed fields
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      address: req.body.address,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      logoUrl: req.body.logoUrl, // Allow updating the logo URL
    };
    
    const updatedOrganization = await storage.updateOrganization(orgId, updateData);
    
    if (!updatedOrganization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(200).json(updatedOrganization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    // Only super_admin can delete organizations
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden: Only super_admin can delete organizations' });
    }
    
    const orgId = parseInt(req.params.id);
    const organization = await storage.getOrganizationById(orgId);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Check if there are users or projects in this organization
    const users = await storage.getOrganizationUsers(orgId);
    const projects = await storage.getProjectsForOrganization(orgId);
    
    if (users.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete organization with existing users. Please remove all users first.' 
      });
    }
    
    if (projects.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete organization with existing projects. Please delete all projects first.' 
      });
    }
    
    await storage.deleteOrganization(orgId);
    
    res.status(200).json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};