import { Request, Response } from 'express';
import { z } from 'zod';
import { sendEmail } from '../utils/emailService';

// Validation schema for invoice email request
const invoiceEmailSchema = z.object({
  from: z.object({
    name: z.string().min(1, "Sender name is required"),
    email: z.string().email("Valid sender email is required")
  }),
  to: z.object({
    name: z.string().optional(),
    email: z.string().email("Valid recipient email is required")
  }),
  subject: z.string().min(1, "Subject is required"),
  message: z.string(),
  pdfData: z.string().min(1, "PDF data is required")
});

/**
 * Send an invoice via email with PDF attachment
 */
export const sendInvoiceEmail = async (req: Request, res: Response) => {
  try {
    // Validate request data
    const validatedData = invoiceEmailSchema.parse(req.body);
    
    // Extract PDF data from the data URI string
    const pdfData = validatedData.pdfData;
    const base64Data = pdfData.split(';base64,').pop() || '';
    
    // Create email content with attachment
    const emailContent = {
      from: `"${validatedData.from.name}" <${validatedData.from.email}>`,
      to: validatedData.to.email,
      subject: validatedData.subject,
      text: validatedData.message,
      html: validatedData.message.replace(/\n/g, '<br>'),
      attachments: [
        {
          filename: 'invoice.pdf',
          content: Buffer.from(base64Data, 'base64'),
          contentType: 'application/pdf'
        }
      ]
    };
    
    // Use the existing emailService to send the email
    const emailSent = await sendEmail(emailContent);
    
    if (emailSent) {
      return res.status(200).json({ success: true, message: 'Invoice email sent successfully' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send invoice email' });
    }
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while sending the invoice email',
      error: error.message
    });
  }
};