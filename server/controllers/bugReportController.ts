import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Define validation schema for bug report
const bugReportSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  stepsToReproduce: z.string().optional(),
  browserInfo: z.string().optional(),
});

/**
 * Send a bug report via email
 */
export const submitBugReport = async (req: Request, res: Response) => {
  try {
    // Validate request data
    const validatedData = bugReportSchema.parse(req.body);
    
    // Get user info from request if authenticated
    const user = req.user ? {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      organization: req.user.currentOrganizationId
    } : null;

    // Create email transporter
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'pawnmedia.ph@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Format the email content
    const emailContent = `
    <h2>Bug Report: ${validatedData.title}</h2>
    <p><strong>Reported by:</strong> ${user ? `${user.username} (${user.email}, ${user.role}, Org ID: ${user.organization})` : 'Anonymous'}</p>
    <p><strong>Reported at:</strong> ${new Date().toLocaleString()}</p>
    
    <h3>Description:</h3>
    <p>${validatedData.description}</p>
    
    ${validatedData.stepsToReproduce ? `
    <h3>Steps to Reproduce:</h3>
    <p>${validatedData.stepsToReproduce}</p>
    ` : ''}
    
    ${validatedData.browserInfo ? `
    <h3>Browser & Device Info:</h3>
    <p>${validatedData.browserInfo}</p>
    ` : ''}
    
    <hr />
    <p><em>This bug report was sent from BayriKo Task Management System.</em></p>
    `;

    // Send the email
    const mailOptions = {
      from: 'pawnmedia.ph@gmail.com',
      to: 'pawnmedia.ph@gmail.com',
      subject: `[BayriKo Bug Report] ${validatedData.title}`,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Bug report submitted successfully' });
  } catch (error) {
    console.error('Error submitting bug report:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit bug report. Please try again later.' 
    });
  }
};