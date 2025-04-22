import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertUserSchema, insertNotificationSchema, User } from '@shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../utils';
import { createRandomOrganizationForUser } from '../utils/organizationGenerator';

// Used by passport for authentication
export const authenticateUser = async (
  email: string,
  password: string,
  done: (error: any, user?: any, options?: { message: string }) => void
) => {
  try {
    console.log(`[AUTH] Login attempt for email: ${email}`);
    const user = await storage.validateUserPassword(email, password);
    
    if (!user) {
      console.log(`[AUTH] Invalid credentials for email: ${email}`);
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    console.log(`[AUTH] Successful authentication for user: ${user.username} (${user.id})`);
    
    // Remove password from user object before serialization
    const { password: _, ...userWithoutPassword } = user;
    
    return done(null, userWithoutPassword);
  } catch (error) {
    console.error('[AUTH] Error during authentication:', error);
    return done(error);
  }
};

export const login = (req: Request, res: Response) => {
  // Log the authentication state
  console.log(`[LOGIN] Authentication state: ${req.isAuthenticated()}`);
  console.log(`[LOGIN] Session ID: ${req.sessionID}`);
  
  // Check if req.user exists and log details
  if (req.user) {
    console.log(`[LOGIN] User successfully authenticated: ${(req.user as User).username} (${(req.user as User).id})`);
    // Return the user without password
    const { password, ...userWithoutPassword } = req.user as User;
    
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });
  } else {
    console.error('[LOGIN] req.user is undefined after passport.authenticate');
    res.status(500).json({
      message: 'Authentication failure: User data missing after login'
    });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, fullName, invitationToken, role = 'staff' } = req.body;
    
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
    
    // Validate user role
    const validRoles = ['staff', 'team_lead', 'supervisor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: staff, team_lead, supervisor' });
    }
    
    // Determine if this is a registration with an invitation token
    let organizationId: number | null = null;
    let isApproved = false;
    let assignedRole = role;
    
    if (invitationToken) {
      // Validate and use invitation token
      const invitationLink = await storage.getInvitationLinkByToken(invitationToken);
      
      if (!invitationLink) {
        return res.status(400).json({ message: 'Invalid invitation token' });
      }
      
      // Check if invitation is active and not expired
      if (!invitationLink.active) {
        return res.status(400).json({ message: 'This invitation link has been deactivated' });
      }
      
      if (invitationLink.expires && new Date() > invitationLink.expires) {
        return res.status(400).json({ message: 'This invitation link has expired' });
      }
      
      if (invitationLink.maxUses && invitationLink.usedCount >= invitationLink.maxUses) {
        return res.status(400).json({ message: 'This invitation link has reached its maximum uses' });
      }
      
      // Use invitation link (increment usage count)
      await storage.incrementInvitationLinkUsage(invitationLink.id);
      
      // Set organization and role from invitation
      organizationId = invitationLink.organizationId;
      assignedRole = invitationLink.role;
      isApproved = true; // Users who register with invitation links are auto-approved
    }
    
    // Create new user
    const userData = {
      username,
      email,
      password,
      fullName: fullName || username,
      role: assignedRole,
      isApproved
    };
    
    const newUser = await storage.createUser(userData);
    
    // Handle organization assignment based on the registration type
    if (organizationId) {
      // For invitation-based registration, add user to the invited organization
      await storage.addUserToOrganization(newUser.id, organizationId, assignedRole);
      
      // Notify organization supervisors about the new user
      const organizationUsers = await storage.getOrganizationUsers(organizationId);
      const supervisorIds = organizationUsers
        .filter(user => user.role === 'supervisor')
        .map(user => user.id);
      
      for (const supervisorId of supervisorIds) {
        await storage.createNotification({
          userId: supervisorId,
          type: 'new_organization_user',
          message: `${username} (${email}) has joined your organization with role ${assignedRole}.`,
          read: false
        });
      }
    } else if (assignedRole === 'supervisor') {
      // For supervisor registration without invitation, create a random organization
      try {
        const newOrgId = await createRandomOrganizationForUser(newUser.id);
        
        // Notify the new supervisor about their organization
        await storage.createNotification({
          userId: newUser.id,
          type: 'new_organization',
          message: `A new organization has been created for your account. You can manage it from the Organizations page.`,
          read: false
        });
      } catch (orgError) {
        console.error('Error creating random organization:', orgError);
        // Continue registration even if org creation fails
      }
    } else {
      // For regular registration (staff/team_lead without invitation)
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
    }
    
    // Find super admin by email and add user to all organizations of the super admin
    const superAdminEmail = await storage.getSuperAdminEmail();
    const superAdmin = await storage.getUserByEmail(superAdminEmail);
    
    if (superAdmin) {
      // Notify the super admin about the new user
      await storage.createNotification({
        userId: superAdmin.id,
        type: 'new_user',
        message: `New user ${username} (${email}) has registered with role ${assignedRole}.`,
        read: false
      });
    }
    
    // Remove password before sending response
    const { password: _, ...userWithoutPassword } = newUser;
    
    let message = 'Registration successful.';
    if (!isApproved) {
      message += ' Your account is pending approval from a supervisor.';
    }
    
    res.status(201).json({
      message,
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
  console.log(`[SESSION] Session ID: ${req.sessionID}`);
  console.log(`[SESSION] Is authenticated: ${req.isAuthenticated()}`);
  
  if (!req.isAuthenticated()) {
    console.log('[SESSION] User not authenticated, returning 401');
    return res.status(401).json({ authenticated: false });
  }
  
  console.log(`[SESSION] User authenticated: ${(req.user as any).username} (${(req.user as any).id})`);
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
    
    // Only allow users to update their own profile unless they are a supervisor or super_admin
    if (req.user?.id !== userId && req.user?.role !== 'supervisor' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
    }
    
    // If user is staff or team_lead, they cannot change their role
    if ((req.user?.role === 'staff' || req.user?.role === 'team_lead') && req.body.role) {
      return res.status(403).json({ message: 'Forbidden: You cannot change your role' });
    }
    
    // Partial validation
    // Allow updating only specific fields
    const allowedFields = ['fullName', 'email', 'password', 'position', 'avatarUrl'];
    if (req.user?.role === 'supervisor' || req.user?.role === 'super_admin') {
      allowedFields.push('role'); // Only supervisors and super_admins can change roles
      allowedFields.push('isApproved'); // Only supervisors and super_admins can approve users
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
    
    // Handle project assignments if provided (supervisors and super_admins only)
    if ((req.user?.role === 'supervisor' || req.user?.role === 'super_admin') && req.body.projectIds && Array.isArray(req.body.projectIds)) {
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
    if (!req.params.id) {
      return res.status(400).json({ message: 'Missing user ID' });
    }
    
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
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
    if (!req.params.id) {
      return res.status(400).json({ message: 'Missing user ID' });
    }
    
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
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
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const loggedInUser = req.user as User;
    let users: User[] = [];
    
    if (loggedInUser.role === 'super_admin') {
      // Super admin can see all users
      users = await storage.getAllUsers();
    } else {
      // Other roles can only see users in their organization
      const userId = parseInt(loggedInUser.id.toString(), 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const userOrgs = await storage.getUserOrganizations(userId);
      if (userOrgs.length > 0) {
        // Get all organization users (use first org if user belongs to multiple)
        const orgId = userOrgs[0].organizationId;
        const orgUsers = await storage.getOrganizationUsers(orgId);
        users = orgUsers;
      }
    }
    
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
    if (!req.params.id) {
      return res.status(400).json({ message: 'Missing user ID' });
    }
    
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
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
    if (!req.params.id) {
      return res.status(400).json({ message: 'Missing user ID' });
    }
    
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const { projectIds } = req.body;
    
    // Only supervisors and super_admins can assign projects
    if (req.user?.role !== 'supervisor' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden: Only supervisors and super admins can assign projects' });
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
      const newAdmin = await storage.createUser({
        username: 'admin',
        password: 'password123', // This will be hashed by the storage method
        email: adminEmail,
        fullName: 'Admin User',
        role: 'super_admin' as const,
        position: 'Administrator',
        isApproved: true
      });
      
      // Set as super admin
      await storage.setSuperAdmin(newAdmin.id);
      
      console.log('Admin user created successfully');
    } else if (existingAdmin.role !== 'super_admin') {
      // Update existing admin to super_admin
      await storage.setSuperAdmin(existingAdmin.id);
      console.log('Updated existing admin to super_admin role');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

// Get organizations for a specific user
export const getUserOrganizations = async (req: Request, res: Response) => {
  try {
    // Ensure we have a valid user ID
    if (!req.params.id) {
      return res.status(400).json({ message: 'Missing user ID' });
    }
    
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    // Make sure the authenticated user exists and has an ID
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Parse authenticated user's ID for comparison
    const authUserId = parseInt(req.user.id.toString(), 10);
    if (isNaN(authUserId)) {
      return res.status(400).json({ message: 'Invalid authenticated user ID' });
    }
    
    // Only allow access to own organizations or if user is a supervisor or super_admin
    if (authUserId !== userId && req.user.role !== 'supervisor' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden: You can only view your own organizations' });
    }
    
    // Get user's organizations
    const userOrgs = await storage.getUserOrganizations(userId);
    
    // Get full organization details for each
    const organizations = await Promise.all(
      userOrgs.map(async (orgUser) => {
        return await storage.getOrganizationById(orgUser.organizationId);
      })
    );
    
    // Filter out any undefined organizations (shouldn't happen, but to be safe)
    const validOrganizations = organizations.filter(org => org !== undefined);
    
    res.status(200).json(validOrganizations);
  } catch (error) {
    console.error('Error getting user organizations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get organizations for the currently authenticated user
export const getCurrentUserOrganizations = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // If user is super_admin, get all organizations
    if (req.user.role === 'super_admin') {
      const allOrgs = await storage.getAllOrganizations();
      return res.status(200).json(allOrgs);
    }
    
    // For regular users, get their organizations
    // Check user ID from session
    const userId = req.user.id;
    if (!userId) {
      console.error('Missing user ID in session');
      return res.status(400).json({ message: 'Missing user ID' });
    }
    
    // Return user organizations
    const userOrgs = await storage.getUserOrganizations(userId);
    
    // Get full organization details for each
    const organizations = await Promise.all(
      userOrgs.map(async (orgUser) => {
        return await storage.getOrganizationById(orgUser.organizationId);
      })
    );
    
    // Filter out any undefined organizations
    const validOrganizations = organizations.filter(org => org !== undefined);
    
    res.status(200).json(validOrganizations);
  } catch (error) {
    console.error('Error getting current user organizations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
