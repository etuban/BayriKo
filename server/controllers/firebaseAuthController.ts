import { Request, Response } from 'express';
import { storage } from '../storage';
import { UsersDto } from '../utils/dto.js';
import { randomBytes } from 'crypto';

/**
 * Handle Firebase Google sign-in
 * This endpoint accepts the user data from Firebase Google authentication
 * and either creates a new user or logs in an existing one
 */
export const handleFirebaseGoogleSignIn = async (req: Request, res: Response) => {
  try {
    const { email, displayName, uid } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    let user = await storage.getUserByEmail(email);

    if (user) {
      // User exists, log them in
      if (!user.isApproved) {
        return res.status(403).json({
          message: 'Your account is pending approval. Please wait for administrator confirmation.'
        });
      }

      // Set the user in the session
      req.login(user, err => {
        if (err) {
          return res.status(500).json({ message: 'Login failed', error: err.message });
        }
        
        // Return user info
        return res.status(200).json(UsersDto.toUserDto(user));
      });
    } else {
      // User doesn't exist, create a new account
      // Generate a secure random password - they'll use Google auth and won't need this
      const password = randomBytes(16).toString('hex');
      
      // Username from email (remove special chars and use part before @)
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + 
        Math.floor(Math.random() * 1000); // Add random numbers to avoid collisions
      
      // Extract first and last name from displayName or use email as fallback
      const fullName = displayName || email.split('@')[0];
      
      // Create the user in our database
      const newUser = await storage.createUser({
        email,
        username,
        password, // Hashed in storage layer
        fullName,
        role: 'staff', // Default role for Google sign-ins
        isApproved: true, // Auto-approve for staff role
        // Store Firebase UID for reference in an object that will be spread into the user object
        ...(uid ? { firebaseUid: uid } : {})
      });

      // Assign the new user to a random organization
      try {
        // Get all organizations
        const organizations = await storage.getAllOrganizations();
        
        if (organizations.length > 0) {
          // Select a random organization
          const randomIndex = Math.floor(Math.random() * organizations.length);
          const randomOrg = organizations[randomIndex];
          
          console.log(`[FIREBASE-AUTH] Assigning new staff user ${username} to random organization: ${randomOrg.name}`);
          
          // Add user to the random organization
          await storage.addUserToOrganization(newUser.id, randomOrg.id, 'staff');
          
          // Notify user about assigned organization
          await storage.createNotification({
            userId: newUser.id,
            type: 'new_organization_user',
            message: `You have been assigned to organization: ${randomOrg.name}`,
            read: false
          });
          
          // Notify organization supervisors about the new user
          const organizationUsers = await storage.getOrganizationUsers(randomOrg.id);
          const supervisorIds = organizationUsers
            .filter(user => user.role === 'supervisor')
            .map(user => user.id);
          
          for (const supervisorId of supervisorIds) {
            await storage.createNotification({
              userId: supervisorId,
              type: 'new_organization_user',
              message: `${username} (${email}) has been auto-assigned to your organization with role staff.`,
              read: false
            });
          }
        } else {
          console.log('[FIREBASE-AUTH] No organizations found for assignment, creating one for the user');
          // If no organizations exist, create a random one for the user
          const { createRandomOrganizationForUser } = require('../utils/organizationGenerator');
          const newOrgId = await createRandomOrganizationForUser(newUser.id);
          
          // Notify the new user about their organization
          await storage.createNotification({
            userId: newUser.id,
            type: 'new_organization',
            message: `A new organization has been created for your account.`,
            read: false
          });
        }
      } catch (orgError) {
        console.error('[FIREBASE-AUTH] Error assigning user to organization:', orgError);
        // Continue with login even if organization assignment fails
      }

      // Set the user in the session
      req.login(newUser, err => {
        if (err) {
          return res.status(500).json({ message: 'Account created but login failed', error: err.message });
        }
        
        // Return user info
        return res.status(201).json({
          ...UsersDto.toUserDto(newUser),
          message: 'Account created successfully. You can now start creating tasks.'
        });
      });
    }
  } catch (error: any) {
    console.error('Firebase Auth Error:', error);
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};