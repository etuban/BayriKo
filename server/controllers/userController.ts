import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertUserSchema, User } from '@shared/schema';
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
        role: 'supervisor',
        position: 'Administrator'
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};
