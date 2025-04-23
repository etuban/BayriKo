import { Request, Response } from "express";
import { storage } from "../storage";
import { UsersDto } from "../utils/dto";

/**
 * Handle Firebase Google sign-in
 * This endpoint accepts the user data from Firebase Google authentication
 * and either creates a new user or logs in an existing one
 */
export const handleFirebaseGoogleSignIn = async (req: Request, res: Response) => {
  try {
    const { email, displayName, uid } = req.body;

    if (!email || !displayName || !uid) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "Email, display name and UID are required"
      });
    }

    // Check if the user already exists
    let user = await storage.getUserByEmail(email);

    if (user) {
      // User exists, log them in
      req.login(UsersDto.toUserDto(user), (err) => {
        if (err) {
          console.error("Error in login:", err);
          return res.status(500).json({ error: "Login error", message: err.message });
        }
        return res.status(200).json(UsersDto.toUserDto(user));
      });
    } else {
      // User doesn't exist, create a new user
      const username = email.split('@')[0] + '-' + Math.floor(1000 + Math.random() * 9000); // Generate a unique username
      
      const newUser = await storage.createUser({
        username,
        email,
        password: `firebase-${uid}`, // Use Firebase UID as part of the password - they won't use this
        fullName: displayName,
        position: '',
        role: 'staff', // Default role
        isApproved: false, // Users need to be approved by admin
      });

      req.login(UsersDto.toUserDto(newUser), (err) => {
        if (err) {
          console.error("Error in login after registration:", err);
          return res.status(500).json({ error: "Login error", message: err.message });
        }
        return res.status(201).json(UsersDto.toUserDto(newUser));
      });
    }
  } catch (error) {
    console.error("Firebase auth error:", error);
    res.status(500).json({ 
      error: "Server error",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
};