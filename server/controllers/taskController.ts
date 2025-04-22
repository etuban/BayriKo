import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertTaskSchema, insertTaskCommentSchema, insertTaskHistorySchema, insertNotificationSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const { projectId, assignedToId, status, search, organizationId } = req.query;
    
    // Convert query params to appropriate types
    const filters: { projectId?: number, assignedToId?: number, status?: string, search?: string } = {};
    
    if (projectId) filters.projectId = parseInt(projectId as string);
    if (assignedToId) filters.assignedToId = parseInt(assignedToId as string);
    if (status) filters.status = status as string;
    if (search) filters.search = search as string;
    
    // Staff can only see tasks assigned to them
    if (req.user?.role === 'staff') {
      filters.assignedToId = req.user.id;
    }
    
    // Get all tasks based on filters
    const tasks = await storage.getAllTasks(filters);
    
    // If user is authenticated, get their organizations
    let userOrganizations: number[] = [];
    if (req.user) {
      const orgUsers = await storage.getUserOrganizations(req.user.id);
      userOrganizations = orgUsers.map(ou => ou.organizationId);
    }
    
    // Specific organization ID was provided in the query
    const requestedOrgId = organizationId 
      ? parseInt(organizationId as string)
      : null;
    
    // Get all projects to filter tasks by organization
    const allProjects = await storage.getAllProjects();
    
    // Filter tasks by organization
    const filteredTasks = await Promise.all(tasks.map(async (task) => {
      const project = allProjects.find(p => p.id === task.projectId);
      
      // If no project found or project has no organization, skip
      if (!project) return null;
      
      // Super admin can see all tasks
      if (req.user?.role === 'super_admin') {
        // If specific organization is requested by super admin, filter by it
        if (requestedOrgId && project.organizationId !== requestedOrgId) {
          return null;
        }
        // Otherwise show all tasks to super admin
        return task;
      }
      
      // For non-super admins:
      // If specific organization requested and project doesn't match, skip
      if (requestedOrgId && project.organizationId !== requestedOrgId) return null;
      
      // If no specific organization requested, check if user has access to this project's organization
      if (!requestedOrgId && userOrganizations.length > 0 && !userOrganizations.includes(project.organizationId)) {
        // User doesn't belong to this organization, skip task
        return null;
      }
      
      return task;
    }));
    
    // Remove null values (filtered out tasks)
    const validTasks = filteredTasks.filter(task => task !== null);
    
    // Get related data for each task
    const tasksWithRelations = await Promise.all(validTasks.map(async (task) => {
      const [project, assignedTo] = await Promise.all([
        storage.getProjectById(task.projectId),
        task.assignedToId ? storage.getUserById(task.assignedToId) : null
      ]);
      
      // Remove password from assignedTo
      const assignedToWithoutPassword = assignedTo 
        ? { ...assignedTo, password: undefined } 
        : null;
      
      return {
        ...task,
        project,
        assignedTo: assignedToWithoutPassword
      };
    }));
    
    res.status(200).json(tasksWithRelations);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await storage.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Get related data
    const [project, assignedTo, creator] = await Promise.all([
      storage.getProjectById(task.projectId),
      task.assignedToId ? storage.getUserById(task.assignedToId) : null,
      storage.getUserById(task.createdById)
    ]);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found for this task' });
    }
    
    // Check if the user has access to the task's organization
    if (req.user && req.user.role !== 'super_admin') {
      const orgUsers = await storage.getUserOrganizations(req.user.id);
      const userOrganizationIds = orgUsers.map(ou => ou.organizationId);
      
      // If the task's project is not in the user's organizations, deny access
      if (!userOrganizationIds.includes(project.organizationId) && 
          // Exception: staff can view tasks assigned to them even if in different org
          !(req.user.role === 'staff' && task.assignedToId === req.user.id)) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to tasks in this organization' });
      }
    }
    
    // Additional check: Staff can only view tasks assigned to them
    if (req.user?.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only view your own tasks' });
    }
    
    // Remove passwords
    const assignedToWithoutPassword = assignedTo 
      ? { ...assignedTo, password: undefined } 
      : null;
    
    const creatorWithoutPassword = creator 
      ? { ...creator, password: undefined } 
      : null;
    
    res.status(200).json({
      ...task,
      project,
      assignedTo: assignedToWithoutPassword,
      createdBy: creatorWithoutPassword
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    // Staff and Team Leads can create tasks
    const taskData = insertTaskSchema.parse({
      ...req.body,
      createdById: req.user?.id
    });
    
    const newTask = await storage.createTask(taskData);
    
    // Create task history for creation
    await storage.createTaskHistory({
      taskId: newTask.id,
      userId: req.user!.id,
      action: 'created',
      details: { task: newTask }
    });
    
    // Create notification for assigned user if any
    if (newTask.assignedToId) {
      await storage.createNotification({
        userId: newTask.assignedToId,
        taskId: newTask.id,
        type: 'task_assigned',
        message: `You have been assigned to task: ${newTask.title}`,
        read: false
      });
    }
    
    res.status(201).json(newTask);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: formatZodError(error) });
    }
    
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const oldTask = await storage.getTaskById(taskId);
    
    if (!oldTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Staff can only update their own tasks
    if (req.user?.role === 'staff' && oldTask.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only update your own tasks' });
    }
    
    // Team leads can update but not delete
    if (req.user?.role === 'team_lead' && req.method === 'DELETE') {
      return res.status(403).json({ message: 'Forbidden: Team leads cannot delete tasks' });
    }
    
    // Update the task
    const updatedTask = await storage.updateTask(taskId, req.body);
    
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Track changes for history
    const changes: Record<string, { from: any, to: any }> = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (oldTask[key as keyof typeof oldTask] !== value) {
        changes[key] = {
          from: oldTask[key as keyof typeof oldTask],
          to: value
        };
      }
    }
    
    // Create task history entry for update
    if (Object.keys(changes).length > 0) {
      await storage.createTaskHistory({
        taskId,
        userId: req.user!.id,
        action: 'updated',
        details: { changes }
      });
      
      // If assignedToId changed, create notification for new assignee
      if (changes.assignedToId && updatedTask.assignedToId) {
        await storage.createNotification({
          userId: updatedTask.assignedToId,
          taskId,
          type: 'task_assigned',
          message: `You have been assigned to task: ${updatedTask.title}`,
          read: false
        });
      }
      
      // If status changed, create notification for assignee
      if (changes.status && updatedTask.assignedToId) {
        await storage.createNotification({
          userId: updatedTask.assignedToId,
          taskId,
          type: 'task_status_changed',
          message: `Task "${updatedTask.title}" status changed to ${updatedTask.status}`,
          read: false
        });
      }
    }
    
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await storage.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check permissions
    // Staff can only delete their own tasks
    if (req.user?.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own tasks' });
    }
    
    // Team leads cannot delete tasks
    if (req.user?.role === 'team_lead') {
      return res.status(403).json({ message: 'Forbidden: Team leads cannot delete tasks' });
    }
    
    // Delete task history, comments, and notifications first
    await Promise.all([
      storage.deleteTaskHistory(taskId),
      storage.deleteTaskComments(taskId),
      storage.deleteTaskNotifications(taskId)
    ]);
    
    // Then delete the task
    await storage.deleteTask(taskId);
    
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const getTaskComments = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await storage.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Staff can only view comments for their own tasks
    if (req.user?.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only view comments for your own tasks' });
    }
    
    const comments = await storage.getTaskComments(taskId);
    
    // Get user information for each comment
    const commentsWithUser = await Promise.all(comments.map(async (comment) => {
      const user = await storage.getUserById(comment.userId);
      return {
        ...comment,
        user: user ? { ...user, password: undefined } : null
      };
    }));
    
    res.status(200).json(commentsWithUser);
  } catch (error) {
    console.error('Error getting task comments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await storage.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const commentData = insertTaskCommentSchema.parse({
      ...req.body,
      taskId,
      userId: req.user?.id
    });
    
    const newComment = await storage.createTaskComment(commentData);
    
    // Create task history entry for comment
    await storage.createTaskHistory({
      taskId,
      userId: req.user!.id,
      action: 'commented',
      details: { commentId: newComment.id }
    });
    
    // Create notification for task assignee if the commenter is not the assignee
    if (task.assignedToId && task.assignedToId !== req.user?.id) {
      await storage.createNotification({
        userId: task.assignedToId,
        taskId,
        type: 'task_comment',
        message: `New comment on task: ${task.title}`,
        read: false
      });
    }
    
    // Get user information for the comment
    const user = await storage.getUserById(newComment.userId);
    const commentWithUser = {
      ...newComment,
      user: user ? { ...user, password: undefined } : null
    };
    
    res.status(201).json(commentWithUser);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: formatZodError(error) });
    }
    
    console.error('Error adding task comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTaskHistory = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await storage.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Staff can only view history for their own tasks
    if (req.user?.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only view history for your own tasks' });
    }
    
    const history = await storage.getTaskHistory(taskId);
    
    // Get user information for each history entry
    const historyWithUser = await Promise.all(history.map(async (entry) => {
      const user = await storage.getUserById(entry.userId);
      return {
        ...entry,
        user: user ? { ...user, password: undefined } : null
      };
    }));
    
    res.status(200).json(historyWithUser);
  } catch (error) {
    console.error('Error getting task history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTaskPayableReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, projectId, organizationId } = req.query;
    
    // Parse date strings to Date objects
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    const project = projectId ? parseInt(projectId as string) : undefined;
    const orgId = organizationId ? parseInt(organizationId as string) : undefined;
    
    // Pass user role and id for staff permissions
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // Get all tasks based on filters
    const allTasks = await storage.getTasksForPayable(start, end, project, userId, userRole);
    
    // If an organization ID is specified, filter tasks by organization
    let tasks = allTasks;
    
    // Get all projects for organization filtering
    const allProjects = await storage.getAllProjects();
    
    if (req.user?.role === 'super_admin') {
      // Super admin can see all tasks
      if (orgId) {
        // If specific organization is requested by super admin, filter by it
        tasks = await Promise.all(allTasks.map(async (task) => {
          const project = allProjects.find(p => p.id === task.projectId);
          
          // If no project found or it doesn't belong to the requested organization, skip
          if (!project || project.organizationId !== orgId) {
            return null;
          }
          
          return task;
        })).then(results => results.filter(task => task !== null));
      }
      // Otherwise show all tasks to super admin
    } else if (orgId) {
      // Regular users with specific organization requested
      tasks = await Promise.all(allTasks.map(async (task) => {
        const project = allProjects.find(p => p.id === task.projectId);
        
        // If no project found or it doesn't belong to the requested organization, skip
        if (!project || project.organizationId !== orgId) {
          return null;
        }
        
        return task;
      })).then(results => results.filter(task => task !== null));
    } else if (req.user) {
      // If no specific org ID requested but user is authenticated (and not super_admin), filter by user's organizations
      const orgUsers = await storage.getUserOrganizations(req.user.id);
      const userOrganizationIds = orgUsers.map(ou => ou.organizationId);
      
      // Filter tasks by user's organizations
      tasks = await Promise.all(allTasks.map(async (task) => {
        const project = allProjects.find(p => p.id === task.projectId);
        
        // If no project found or it doesn't belong to user's organizations, skip
        if (!project || !userOrganizationIds.includes(project.organizationId)) {
          return null;
        }
        
        return task;
      })).then(results => results.filter(task => task !== null));
    }
    
    // Calculate totals and hours
    const tasksWithDetails = await Promise.all(tasks.map(async (task) => {
      // Get project and assigned user details
      const [project, assignedTo] = await Promise.all([
        storage.getProjectById(task.projectId),
        task.assignedToId ? storage.getUserById(task.assignedToId) : null
      ]);
      
      let hours = 0;
      let totalAmount = 0;
      
      // Calculate hours if we have start and end dates/times
      if (task.startDate && task.endDate) {
        try {
          const startDateTime = new Date(task.startDate);
          const endDateTime = new Date(task.endDate);
          
          // Make sure both dates are valid before proceeding
          if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
            // Apply times if available
            if (task.startTime) {
              try {
                const [startHours, startMinutes] = task.startTime.split(':').map(Number);
                startDateTime.setHours(startHours, startMinutes);
              } catch (e) {
                console.error('Invalid start time format:', task.startTime);
              }
            }
            
            if (task.endTime) {
              try {
                const [endHours, endMinutes] = task.endTime.split(':').map(Number);
                endDateTime.setHours(endHours, endMinutes);
              } catch (e) {
                console.error('Invalid end time format:', task.endTime);
              }
            }
            
            // Calculate hours difference only if dates are valid
            if (endDateTime >= startDateTime) {
              hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
              hours = Math.round(hours * 100) / 100; // Round to 2 decimal places
            } else {
              console.warn('End date is before start date for task:', task.id);
            }
          }
        } catch (e) {
          console.error('Error calculating hours for task:', task.id, e);
        }
      }
      
      // Calculate total amount
      if (task.pricingType === 'hourly' && task.hourlyRate) {
        totalAmount = hours * (task.hourlyRate / 100); // Convert cents to dollars
      } else if (task.pricingType === 'fixed' && task.fixedPrice) {
        totalAmount = task.fixedPrice / 100; // Convert cents to dollars
      }
      
      return {
        ...task,
        project,
        assignedTo: assignedTo ? { ...assignedTo, password: undefined } : null,
        hours: task.pricingType === 'hourly' ? hours : 'Fixed',
        totalAmount
      };
    }));
    
    // Calculate grand total
    const grandTotal = tasksWithDetails.reduce((total, task) => {
      return total + task.totalAmount;
    }, 0);
    
    res.status(200).json({
      tasks: tasksWithDetails,
      grandTotal
    });
  } catch (error) {
    console.error('Error generating payable report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
