import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { storage } from '../storage';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { sendPasswordResetEmail } from '../utils/emailService';

const scryptAsync = promisify(scrypt);

// Schema for request validation
const requestResetSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" })
});

const validateTokenSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" })
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters" })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Helper function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Create a password reset token and send reset email
 */
export const createPasswordReset = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = requestResetSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const { email } = result.data;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists in the system for security reasons
      return res.status(200).json({ message: "If your email is registered in our system, you will receive password reset instructions shortly." });
    }

    // Generate a unique token
    const token = uuidv4();
    
    // Create expiration date (24 hours from now)
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    // Create password reset record
    await storage.createPasswordReset({
      userId: user.id,
      token,
      expires,
      used: false
    });

    // Send password reset email
    await sendPasswordResetEmail(user, token);

    return res.status(200).json({ 
      message: "If your email is registered in our system, you will receive password reset instructions shortly." 
    });
  } catch (error) {
    console.error('Error creating password reset:', error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};

/**
 * Validate a password reset token
 */
export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ valid: false, message: "Reset token is required" });
    }

    // Find password reset record
    const resetRecord = await storage.getPasswordResetByToken(token);
    
    // If no record found or token already used
    if (!resetRecord || resetRecord.used) {
      return res.status(400).json({ valid: false, message: "Invalid or expired reset token" });
    }

    // Check if token has expired
    const now = new Date();
    if (now > resetRecord.expires) {
      return res.status(400).json({ valid: false, message: "Reset token has expired" });
    }

    // Get user info (without sensitive data)
    const user = await storage.getUserById(resetRecord.userId);
    if (!user) {
      return res.status(400).json({ valid: false, message: "User not found" });
    }

    return res.status(200).json({
      valid: true,
      message: "Valid reset token",
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error validating reset token:', error);
    return res.status(500).json({ valid: false, message: "An error occurred. Please try again later." });
  }
};

/**
 * Reset password using a valid token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.errors[0].message });
    }

    const { token, password } = result.data;

    // Find password reset record
    const resetRecord = await storage.getPasswordResetByToken(token);
    
    // If no record found or token already used
    if (!resetRecord || resetRecord.used) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Check if token has expired
    const now = new Date();
    if (now > resetRecord.expires) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    // Get user
    const user = await storage.getUserById(resetRecord.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user's password
    await storage.updateUser(user.id, {
      password: hashedPassword
    });

    // Mark reset token as used
    await storage.markPasswordResetAsUsed(resetRecord.id);

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};