import { Request, Response } from "express";
import { z } from "zod";
import { sendEmail } from "../utils/emailService";

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(5),
  message: z.string().min(10),
});

export const submitContactForm = async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const validatedData = contactFormSchema.parse(req.body);
    const { name, email, subject, message } = validatedData;

    // Prepare HTML email content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">BayriKo Contact Form Submission</h1>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #4CAF50; background-color: #f9f9f9;">
          ${message.replace(/\\n/g, '<br>')}
        </div>
        <p style="color: #777; font-size: 12px;">This message was sent from the BayriKo contact form.</p>
      </div>
    `;

    // Plain text version
    const text = `
      BayriKo Contact Form Submission
      
      From: ${name} (${email})
      Subject: ${subject}
      
      Message:
      ${message}
      
      This message was sent from the BayriKo contact form.
    `;

    // Send the email
    const emailSent = await sendEmail({
      to: "pawnmedia.ph@gmail.com",
      from: "pawnmedia.ph@gmail.com",
      subject: `BayriKo Contact: ${subject}`,
      text,
      html
    });

    if (emailSent) {
      res.status(200).json({ message: "Contact form submitted successfully" });
    } else {
      throw new Error("Failed to send email");
    }
  } catch (error) {
    console.error("Contact form submission error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: "Failed to submit contact form" });
  }
};