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

      // Create a new organization for the user with Firebase/Google sign-in
      try {
        // Import the organization generator
        const { createRandomOrganizationForUser } = require('../utils/organizationGenerator');
        
        console.log(`[FIREBASE-AUTH] Creating a new organization for user ${username}`);
        
        // Create a new random organization and assign the user as staff
        const newOrgId = await createRandomOrganizationForUser(newUser.id, 'staff');
        
        console.log(`[FIREBASE-AUTH] Created new organization ID: ${newOrgId} for user ID: ${newUser.id}`);
        
        // Notify the new user about their new organization
        await storage.createNotification({
          userId: newUser.id,
          type: 'new_organization',
          message: `A new organization has been created for your account.`,
          read: false
        });
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