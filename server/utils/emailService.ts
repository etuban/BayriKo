import nodemailer from 'nodemailer';
import { User, Organization, InvitationLink } from '@shared/schema';

// This is a simple email service using Gmail
let transporter: nodemailer.Transporter | null = null;

// Initialize the transporter using Gmail
function initializeTransporter() {
  if (transporter) return;
  
  try {
    // Create a Gmail transporter using App Password
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'pawnmedia.ph@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD, // App Password from environment variables
      }
    });
    
    console.log('Gmail transporter initialized');
  } catch (error) {
    console.error('Failed to create Gmail transporter:', error);
  }
}

// Initialize transporter on module load
initializeTransporter();

export interface EmailData {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using Nodemailer
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Make sure transporter is initialized
    if (!transporter) {
      await initializeTransporter();
      if (!transporter) {
        console.error('Failed to initialize email transporter');
        return false;
      }
    }

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    console.log(`Email sent successfully: ${info.messageId}`);
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send feedback submission email
 */
export async function sendFeedbackEmail(feedbackData: {
  feedback: string;
  featureRequests?: string;
  improvements?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  organizationId?: number;
}): Promise<boolean> {
  const to = 'pawnmedia.ph@gmail.com';
  const from = 'pawnmedia.ph@gmail.com'; // Using your verified sender email
  const subject = 'BayriKo Feedback Submission';
  
  // Construct the HTML content
  const html = `
    <h1>New Feedback Submission</h1>
    <p><strong>From:</strong> ${feedbackData.userName || 'Anonymous'} (${feedbackData.userEmail || 'No email'})</p>
    <p><strong>Role:</strong> ${feedbackData.userRole || 'Not specified'}</p>
    <p><strong>Organization ID:</strong> ${feedbackData.organizationId || 'Not specified'}</p>
    
    <h2>Feedback:</h2>
    <div style="padding: 10px; border-left: 4px solid #4CAF50; background-color: #f9f9f9; margin-bottom: 20px;">
      ${feedbackData.feedback.replace(/\n/g, '<br>')}
    </div>
    
    ${feedbackData.featureRequests ? `
    <h2>Feature Requests:</h2>
    <div style="padding: 10px; border-left: 4px solid #2196F3; background-color: #f9f9f9; margin-bottom: 20px;">
      ${feedbackData.featureRequests.replace(/\n/g, '<br>')}
    </div>
    ` : ''}
    
    ${feedbackData.improvements ? `
    <h2>Suggested Improvements:</h2>
    <div style="padding: 10px; border-left: 4px solid #FF9800; background-color: #f9f9f9; margin-bottom: 20px;">
      ${feedbackData.improvements.replace(/\n/g, '<br>')}
    </div>
    ` : ''}
    
    <p style="font-size: 12px; color: #777;">This email was sent from the BayriKo application feedback form.</p>
  `;
  
  // Plain text version
  const text = `
    New Feedback Submission
    
    From: ${feedbackData.userName || 'Anonymous'} (${feedbackData.userEmail || 'No email'})
    Role: ${feedbackData.userRole || 'Not specified'}
    Organization ID: ${feedbackData.organizationId || 'Not specified'}
    
    Feedback:
    ${feedbackData.feedback}
    
    ${feedbackData.featureRequests ? `Feature Requests:\n${feedbackData.featureRequests}\n\n` : ''}
    ${feedbackData.improvements ? `Suggested Improvements:\n${feedbackData.improvements}` : ''}
    
    This email was sent from the BayriKo application feedback form.
  `;
  
  return sendEmail({
    to,
    from,
    subject,
    text,
    html
  });
}

/**
 * Send account approval notification email to a user
 */
export async function sendAccountApprovalEmail(user: User, organization?: Organization): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send approval email: User has no email');
    return false;
  }

  const to = user.email;
  const from = 'pawnmedia.ph@gmail.com';
  const subject = 'Your BayriKo Account Has Been Approved';
  
  // Get organization info if available
  const orgInfo = organization ? 
    `<p>You've been assigned to the following organization: <strong>${organization.name}</strong></p>` : 
    '<p>Please contact your supervisor for organization assignment details.</p>';
  
  const loginLink = `https://bayriko.pawn.media`;
  
  // Construct the HTML content
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0;">BayriKo</h1>
        <p style="margin: 5px 0 0 0;">Task Management System</p>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
        <h2>Account Approved</h2>
        <p>Hello ${user.fullName || user.username},</p>
        <p>Your BayriKo account has been approved and is now ready to use!</p>
        
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Username: ${user.username}</li>
          <li>Role: ${user.role}</li>
        </ul>
        
        ${orgInfo}
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Log In to BayriKo
          </a>
        </div>
        
        <p>If you have any questions, please contact your organization administrator.</p>
        <p>Thank you for using BayriKo!</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        <p>&copy; ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Plain text version
  const text = `
    BayriKo - Account Approved
    
    Hello ${user.fullName || user.username},
    
    Your BayriKo account has been approved and is now ready to use!
    
    Account Details:
    - Username: ${user.username}
    - Role: ${user.role}
    
    ${organization ? `You've been assigned to organization: ${organization.name}` : 'Please contact your supervisor for organization assignment details.'}
    
    Log in at: ${loginLink}
    
    If you have any questions, please contact your organization administrator.
    
    Thank you for using BayriKo!
    
    © ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.
  `;
  
  return sendEmail({
    to,
    from,
    subject,
    text,
    html
  });
}

/**
 * Send welcome email to a new user who has automatically been approved (staff role)
 */
export async function sendWelcomeEmail(user: User, organization?: Organization): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send welcome email: User has no email');
    return false;
  }

  const to = user.email;
  const from = 'pawnmedia.ph@gmail.com';
  const subject = 'Welcome to BayriKo';
  
  // Get organization info if available
  const orgInfo = organization ? 
    `<p>You've been assigned to the following organization: <strong>${organization.name}</strong></p>` : 
    '<p>You will need to be assigned to an organization by an administrator.</p>';
  
  const loginLink = `https://bayriko.pawn.media`;
  
  // Construct the HTML content
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0;">BayriKo</h1>
        <p style="margin: 5px 0 0 0;">Task Management System</p>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
        <h2>Welcome to BayriKo!</h2>
        <p>Hello ${user.fullName || user.username},</p>
        <p>Your BayriKo account has been created and is ready to use!</p>
        
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Username: ${user.username}</li>
          <li>Role: ${user.role}</li>
        </ul>
        
        ${orgInfo}
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Log In to BayriKo
          </a>
        </div>
        
        <p>If you have any questions, please contact your organization administrator.</p>
        <p>Thank you for joining BayriKo!</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        <p>&copy; ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Plain text version
  const text = `
    BayriKo - Welcome!
    
    Hello ${user.fullName || user.username},
    
    Your BayriKo account has been created and is ready to use!
    
    Account Details:
    - Username: ${user.username}
    - Role: ${user.role}
    
    ${organization ? `You've been assigned to organization: ${organization.name}` : 'You will need to be assigned to an organization by an administrator.'}
    
    Log in at: ${loginLink}
    
    If you have any questions, please contact your organization administrator.
    
    Thank you for joining BayriKo!
    
    © ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.
  `;
  
  return sendEmail({
    to,
    from,
    subject,
    text,
    html
  });
}

/**
 * Send password reset email to a user
 */
export async function sendPasswordResetEmail(
  user: User,
  resetToken: string
): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send password reset email: User has no email');
    return false;
  }

  const to = user.email;
  const from = 'pawnmedia.ph@gmail.com';
  const subject = 'Reset Your BayriKo Password';
  
  // Create the reset URL
  const baseUrl = process.env.APP_URL || 'https://bayriko.pawn.media';
  const resetUrl = `${baseUrl}/login?reset=${resetToken}`;
  
  // Expiration information (24 hours from now)
  const expiresDate = new Date();
  expiresDate.setHours(expiresDate.getHours() + 24);
  const expiresInfo = `This reset link will expire on ${expiresDate.toLocaleDateString()} at ${expiresDate.toLocaleTimeString()}.`;
  
  // Construct the HTML content
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0;">BayriKo</h1>
        <p style="margin: 5px 0 0 0;">Task Management System</p>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.fullName || user.username},</p>
        <p>We received a request to reset your password for your BayriKo account. If you did not make this request, you can safely ignore this email.</p>
        
        <p>To reset your password, click on the button below:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset My Password
          </a>
        </div>
        
        <p style="color: #777; font-size: 14px;">${expiresInfo}</p>
        <p style="color: #777; font-size: 14px;">If the button above doesn't work, copy and paste this URL into your browser: ${resetUrl}</p>
        
        <p>If you did not request a password reset, please contact the system administrator.</p>
        <p>Thank you!</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        <p>&copy; ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Plain text version
  const text = `
    BayriKo - Password Reset Request
    
    Hello ${user.fullName || user.username},
    
    We received a request to reset your password for your BayriKo account. If you did not make this request, you can safely ignore this email.
    
    To reset your password, click on this link or copy and paste it into your browser:
    ${resetUrl}
    
    ${expiresInfo}
    
    If you did not request a password reset, please contact the system administrator.
    
    Thank you!
    
    © ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.
  `;
  
  return sendEmail({
    to,
    from,
    subject,
    text,
    html
  });
}

/**
 * Send invitation link to a recipient's email
 */
export async function sendInvitationEmail(
  recipientEmail: string, 
  invitationLink: InvitationLink, 
  organization: Organization, 
  sender?: User
): Promise<boolean> {
  if (!recipientEmail) {
    console.error('Cannot send invitation email: No recipient email provided');
    return false;
  }

  const to = recipientEmail;
  const from = 'pawnmedia.ph@gmail.com';
  const subject = `You've Been Invited to Join BayriKo`;
  
  // Create the invitation URL
  const baseUrl = process.env.APP_URL || 'https://bayriko.pawn.media';
  const invitationUrl = `${baseUrl}/register?token=${invitationLink.token}`;
  
  // Expiration information
  let expirationInfo = '';
  if (invitationLink.expires) {
    const expDate = new Date(invitationLink.expires);
    expirationInfo = `<p><strong>Invitation expires:</strong> ${expDate.toLocaleDateString()} at ${expDate.toLocaleTimeString()}</p>`;
  }
  
  // Usage limit information
  let usageInfo = '';
  if (invitationLink.maxUses) {
    usageInfo = `<p><strong>This invitation link can be used:</strong> ${invitationLink.maxUses - invitationLink.usedCount} more times</p>`;
  }
  
  // Custom message from the sender
  const customMessage = invitationLink.message ? 
    `<div style="padding: 15px; border-left: 4px solid #4CAF50; background-color: #f9f9f9; margin: 20px 0;">
      <p style="font-style: italic;">"${invitationLink.message}"</p>
      ${sender ? `<p style="text-align: right; margin-bottom: 0;">- ${sender.fullName || sender.username}</p>` : ''}
    </div>` : '';
  
  // Construct the HTML content
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0;">BayriKo</h1>
        <p style="margin: 5px 0 0 0;">Task Management System</p>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
        <h2>You've Been Invited!</h2>
        <p>Hello,</p>
        <p>You've been invited to join <strong>${organization.name}</strong> on BayriKo as a <strong>${invitationLink.role}</strong>.</p>
        
        ${customMessage}
        
        <p><strong>Organization:</strong> ${organization.name}</p>
        <p><strong>Role:</strong> ${invitationLink.role}</p>
        ${expirationInfo}
        ${usageInfo}
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${invitationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p>If you have any questions, please contact the sender of this invitation.</p>
        <p>Thank you!</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        <p>&copy; ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Plain text version
  const text = `
    BayriKo - Invitation to Join

    Hello,
    
    You've been invited to join ${organization.name} on BayriKo as a ${invitationLink.role}.
    
    ${invitationLink.message ? `Message: "${invitationLink.message}"` : ''}
    
    Organization: ${organization.name}
    Role: ${invitationLink.role}
    ${invitationLink.expires ? `Invitation expires: ${new Date(invitationLink.expires).toLocaleString()}` : ''}
    ${invitationLink.maxUses ? `This invitation link can be used: ${invitationLink.maxUses - invitationLink.usedCount} more times` : ''}
    
    Accept the invitation at: ${invitationUrl}
    
    If you have any questions, please contact the sender of this invitation.
    
    Thank you!
    
    © ${new Date().getFullYear()} BayriKo by Pawn Media. All rights reserved.
  `;
  
  return sendEmail({
    to,
    from,
    subject,
    text,
    html
  });
}