import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertProjectSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    let projects;
    const organizationId = req.query.organizationId 
      ? parseInt(req.query.organizationId as string) 
      : req.user?.currentOrganizationId;
    
    if (req.user) {
      if (req.user.role === 'super_admin' && !organizationId) {
        // Super admins can see all projects, but they can also filter by org
        projects = organizationId 
          ? await storage.getProjectsForOrganization(organizationId) 
          : await storage.getAllProjects();
      } else if (organizationId) {
        // Filter by organization if specified
        projects = await storage.getProjectsForOrganization(organizationId);
      } else {
        // Regular users can only see projects they're part of
        projects = await storage.getProjectsForUser(req.user.id);
      }
    } else {
      // Fallback (should not happen as endpoint is protected)
      projects = [];
    }
    
    // Get creator information and task count for each project
    const projectsWithDetails = await Promise.all(projects.map(async (project) => {
      const creator = await storage.getUserById(project.createdById);
      // Get task count for this project
      const tasks = await storage.getAllTasks({ projectId: project.id });
      
      return {
        ...project,
        creator: creator ? { ...creator, password: undefined } : null,
        taskCount: tasks.length
      };
    }));
    
    res.status(200).json(projectsWithDetails);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has access to this project based on organization
    if (req.user && req.user.role !== 'super_admin') {
      // Get user's organizations
      const userOrgs = await storage.getUserOrganizations(req.user.id);
      const userOrgIds = userOrgs.map(org => org.organizationId);
      
      // If user doesn't belong to the project's organization, deny access
      if (!userOrgIds.includes(project.organizationId)) {
        return res.status(403).json({ message: 'You do not have access to this project' });
      }
      
      // If user is staff, also check if they're assigned to this project
      if (req.user.role === 'staff') {
        const userProjects = await storage.getProjectsForUser(req.user.id);
        const projectIds = userProjects.map(p => p.id);
        
        if (!projectIds.includes(projectId)) {
          return res.status(403).json({ message: 'You do not have access to this project' });
        }
      }
    }
    
    // Get creator information
    const creator = await storage.getUserById(project.createdById);
    
    // Get all tasks for this project
    const tasks = await storage.getAllTasks({ projectId });
    
    res.status(200).json({
      ...project,
      creator: creator ? { ...creator, password: undefined } : null,
      taskCount: tasks.length
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    // Get the user's organizations
    let organizationId = req.body.organizationId;
    
    // If no organization ID is provided, use the default organization for the user
    if (!organizationId && req.user) {
      const userOrgs = await storage.getUserOrganizations(req.user.id);
      if (userOrgs && userOrgs.length > 0) {
        // Use the first organization the user belongs to
        organizationId = userOrgs[0].organizationId;
      } else {
        // Fallback to the default organization ID 1
        organizationId = 1;
      }
    }
    
    const projectData = insertProjectSchema.parse({
      ...req.body,
      createdById: req.user?.id,
      organizationId: organizationId || 1
    });
    
    const newProject = await storage.createProject(projectData);
    
    // Get creator information
    const creator = await storage.getUserById(newProject.createdById);
    
    res.status(201).json({
      ...newProject,
      creator: creator ? { ...creator, password: undefined } : null
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: formatZodError(error) });
    }
    
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Only allow updating name and description
    const updateData = {
      name: req.body.name,
      description: req.body.description
    };
    
    const updatedProject = await storage.updateProject(projectId, updateData);
    
    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get creator information
    const creator = await storage.getUserById(updatedProject.createdById);
    
    res.status(200).json({
      ...updatedProject,
      creator: creator ? { ...creator, password: undefined } : null
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if there are tasks associated with this project
    const tasks = await storage.getAllTasks({ projectId });
    
    if (tasks.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete project with existing tasks. Please delete or reassign all tasks first.' 
      });
    }
    
    await storage.deleteProject(projectId);
    
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
