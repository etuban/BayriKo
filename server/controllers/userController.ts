import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertUserSchema, insertNotificationSchema, User } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';

// Used by passport for authentication
export const authenticateUser = async (
  email: string,
  password: string,
  done: (error: any, user?: any, options?: { message: string }) => void
) => {
  try {
    const user = await storage.validateUserPassword(email, password);
    
    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    // Remove password from user object before serialization
    const { password: _, ...userWithoutPassword } = user;
    
    return done(null, userWithoutPassword);
  } catch (error) {
    return done(error);
  }
};

export const login = (req: Request, res: Response) => {
  // Passport.authenticate already validated the user
  // Return the user without password
  const { password, ...userWithoutPassword } = req.user as User;
  
  res.status(200).json({
    message: 'Login successful',
    user: userWithoutPassword
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, fullName } = req.body;
    
    // Check if email already exists
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Check if username already exists
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already in use' });
    }
    
    // Create new user with default role 'staff' and isApproved false
    const userData = {
      username,
      email,
      password,
      fullName: fullName || username,
      role: 'staff' as const,
      isApproved: false
    };
    
    const newUser = await storage.createUser(userData);
    
    // Send notification to all supervisors about new user registration
    const supervisors = await storage.getAllUsers();
    const supervisorIds = supervisors
      .filter(user => user.role === 'supervisor')
      .map(user => user.id);
    
    // Create notifications for each supervisor
    for (const supervisorId of supervisorIds) {
      await storage.createNotification({
        userId: supervisorId,
        type: 'new_user',
        message: `New user ${username} (${email}) has registered and requires approval. Please assign projects and approve the user.`,
        read: false
      });
    }
    
    // Remove password before sending response
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'Registration successful. Your account is pending approval from a supervisor.',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.status(200).json({ message: 'Logout successful' });
  });
};

export const getSession = (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ authenticated: false });
  }
  
  res.status(200).json({
    authenticated: true,
    user: req.user
  });
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if email already exists
    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Check if username already exists
    const existingUserByUsername = await storage.getUserByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already in use' });
    }
    
    const newUser = await storage.createUser(userData);
    
    // Remove password before sending response
    const { password, ...userWithoutPassword } = newUser;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: formatZodError(error) });
    }
    
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Only allow users to update their own profile unless they are a supervisor
    if (req.user?.id !== userId && req.user?.role !== 'supervisor') {
      return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
    }
    
    // If user is staff or team_lead, they cannot change their role
    if ((req.user?.role === 'staff' || req.user?.role === 'team_lead') && req.body.role) {
      return res.status(403).json({ message: 'Forbidden: You cannot change your role' });
    }
    
    // Partial validation
    // Allow updating only specific fields
    const allowedFields = ['fullName', 'email', 'password', 'position', 'avatarUrl'];
    if (req.user?.role === 'supervisor') {
      allowedFields.push('role'); // Only supervisors can change roles
      allowedFields.push('isApproved'); // Only supervisors can approve users
    }
    
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    }
    
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Handle project assignments if provided (supervisors only)
    if (req.user?.role === 'supervisor' && req.body.projectIds && Array.isArray(req.body.projectIds)) {
      // Get current project assignments
      const currentAssignments = await storage.getUserProjects(userId);
      const currentProjectIds = currentAssignments.map(a => a.projectId);
      const newProjectIds = req.body.projectIds as number[];
      
      // Remove assignments that are not in the new list
      for (const assignment of currentAssignments) {
        if (!newProjectIds.includes(assignment.projectId)) {
          await storage.removeUserFromProject(userId, assignment.projectId);
        }
      }
      
      // Add new assignments
      for (const projectId of newProjectIds) {
        if (!currentProjectIds.includes(projectId)) {
          await storage.assignUserToProject(userId, projectId);
        }
      }
      
      // If the user was just approved and assigned projects, create a notification
      if (updateData.isApproved && updatedUser.isApproved && newProjectIds.length > 0) {
        await storage.createNotification({
          userId: userId,
          type: 'account_approved',
          message: 'Your account has been approved and you have been assigned to projects.',
          read: false
        });
      }
    }
    
    // Remove password before sending response
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove password before sending response
    const { password, ...userWithoutPassword } = user;
    
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if user exists
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting the admin user with email pawnmedia.ph@gmail.com
    if (user.email === 'pawnmedia.ph@gmail.com') {
      return res.status(403).json({ message: 'Cannot delete the admin user' });
    }
    
    await storage.deleteUser(userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    
    // Remove passwords from all users
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.status(200).json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get projects assigned to a specific user
export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if user exists
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get project assignments
    const userProjects = await storage.getUserProjects(userId);
    
    // Get full project details for each assignment
    const projects = await Promise.all(
      userProjects.map(async (assignment) => {
        return await storage.getProjectById(assignment.projectId);
      })
    );
    
    // Filter out any undefined projects (shouldn't happen, but to be safe)
    const validProjects = projects.filter(project => project !== undefined);
    
    res.status(200).json(validProjects);
  } catch (error) {
    console.error('Error getting user projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Assign projects to a user (supervisor only)
export const assignProjectsToUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { projectIds } = req.body;
    
    // Only supervisors can assign projects
    if (req.user?.role !== 'supervisor') {
      return res.status(403).json({ message: 'Forbidden: Only supervisors can assign projects' });
    }
    
    // Check if user exists
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate projectIds
    if (!Array.isArray(projectIds)) {
      return res.status(400).json({ message: 'projectIds must be an array of project IDs' });
    }
    
    // Get current project assignments
    const currentAssignments = await storage.getUserProjects(userId);
    const currentProjectIds = currentAssignments.map(a => a.projectId);
    
    // Remove assignments that are not in the new list
    for (const assignment of currentAssignments) {
      if (!projectIds.includes(assignment.projectId)) {
        await storage.removeUserFromProject(userId, assignment.projectId);
      }
    }
    
    // Add new assignments
    for (const projectId of projectIds) {
      if (!currentProjectIds.includes(projectId)) {
        await storage.assignUserToProject(userId, projectId);
      }
    }
    
    // Get updated assignments with project details
    const updatedUserProjects = await storage.getUserProjects(userId);
    const projects = await Promise.all(
      updatedUserProjects.map(async (assignment) => {
        return await storage.getProjectById(assignment.projectId);
      })
    );
    
    // Filter out any undefined projects
    const validProjects = projects.filter(project => project !== undefined);
    
    res.status(200).json({
      message: 'Projects assigned successfully',
      projects: validProjects
    });
  } catch (error) {
    console.error('Error assigning projects to user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Seed the admin user if it doesn't exist
export const seedAdminUser = async () => {
  try {
    const adminEmail = 'pawnmedia.ph@gmail.com';
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (!existingAdmin) {
      await storage.createUser({
        username: 'admin',
        password: 'password123', // This will be hashed by the storage method
        email: adminEmail,
        fullName: 'Admin User',
        role: 'supervisor' as const,
        position: 'Administrator',
        isApproved: true
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};
