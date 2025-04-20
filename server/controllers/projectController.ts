import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertProjectSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = await storage.getAllProjects();
    
    // Get creator information for each project
    const projectsWithCreator = await Promise.all(projects.map(async (project) => {
      const creator = await storage.getUserById(project.createdById);
      return {
        ...project,
        creator: creator ? { ...creator, password: undefined } : null
      };
    }));
    
    res.status(200).json(projectsWithCreator);
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
    const projectData = insertProjectSchema.parse({
      ...req.body,
      createdById: req.user?.id
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
