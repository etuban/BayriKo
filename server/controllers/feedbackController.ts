import { Request, Response } from 'express';
import { z } from 'zod';
import { sendFeedbackEmail } from '../utils/emailService';

// Define validation schema for feedback submissions
const feedbackSchema = z.object({
  feedback: z.string().min(5, "Feedback must be at least 5 characters").max(2000, "Feedback must be less than 2000 characters"),
  featureRequests: z.string().optional(),
  improvements: z.string().optional(),
  userEmail: z.string().email("Invalid email").optional(),
  userName: z.string().optional(),
  userRole: z.string().optional(),
  organizationId: z.number().optional(),
});

/**
 * Handle feedback submission
 */
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = feedbackSchema.parse(req.body);
    
    // Send email with feedback details
    const emailSent = await sendFeedbackEmail({
      feedback: validatedData.feedback,
      featureRequests: validatedData.featureRequests,
      improvements: validatedData.improvements,
      userEmail: validatedData.userEmail || req.user?.email,
      userName: validatedData.userName || req.user?.fullName,
      userRole: validatedData.userRole || req.user?.role,
      organizationId: validatedData.organizationId,
    });

    if (!emailSent) {
      console.warn('Email service failed to send feedback email, but feedback was processed');
    }

    // Respond with success
    return res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      emailSent
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data',
        errors: error.errors,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
};