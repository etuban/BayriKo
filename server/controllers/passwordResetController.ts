import { Request, Response } from 'express';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { formatZodError } from '../utils';
import { sendPasswordResetEmail } from '../utils/emailService';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { passwordResets } from '@shared/schema';
import { hash } from 'bcrypt';

// Generate a unique token for password reset
function generateResetToken(): string {
  return uuidv4().replace(/-/g, '');
}

// Create a password reset request
export const createPasswordReset = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email('Please provide a valid email address'),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }

    const { email } = result.data;
    
    // Find the user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      // Always return success even if the email doesn't exist
      return res.status(200).json({ 
        success: true,
        message: 'If your email is registered, you will receive password reset instructions.'
      });
    }

    // Generate a reset token
    const resetToken = generateResetToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours
    
    // Store the reset token in the database
    await db.insert(passwordResets).values({
      userId: user.id,
      token: resetToken,
      expires,
      used: false
    });
    
    // Send reset email
    await sendPasswordResetEmail(user, resetToken);
    
    res.status(200).json({ 
      success: true,
      message: 'If your email is registered, you will receive password reset instructions.'
    });
  } catch (error) {
    console.error('Error creating password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Validate reset token
export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find the reset entry
    const [resetEntry] = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.token, token));
    
    if (!resetEntry) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Invalid or expired reset token'
      });
    }
    
    // Check if token is expired
    if (resetEntry.expires < new Date() || resetEntry.used) {
      return res.status(400).json({ 
        valid: false, 
        message: 'This reset link has expired or already been used'
      });
    }
    
    res.status(200).json({ 
      valid: true,
      userId: resetEntry.userId
    });
  } catch (error) {
    console.error('Error validating reset token:', error);
    res.status(500).json({ error: 'Failed to validate reset token' });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      token: z.string(),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }

    const { token, password } = result.data;
    
    // Find the reset entry
    const [resetEntry] = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.token, token));
    
    if (!resetEntry) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token'
      });
    }
    
    // Check if token is expired or used
    if (resetEntry.expires < new Date() || resetEntry.used) {
      return res.status(400).json({ 
        success: false, 
        message: 'This reset link has expired or already been used'
      });
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await hash(password, saltRounds);
    
    // Update the user's password
    const user = await storage.getUserById(resetEntry.userId);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found'
      });
    }
    
    await storage.updateUser(user.id, { password: hashedPassword });
    
    // Mark token as used
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.token, token));
    
    res.status(200).json({ 
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};