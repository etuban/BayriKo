import nodemailer from 'nodemailer';

// Create a test account using Ethereal (for development)
let testAccount: nodemailer.TestAccount | null = null;
let transporter: nodemailer.Transporter | null = null;

// Initialize the transporter
async function initializeTransporter() {
  if (transporter) return;
  
  try {
    // Create test account for development environment
    testAccount = await nodemailer.createTestAccount();
    
    // Create reusable transporter
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('Nodemailer test account created:', testAccount.user);
  } catch (error) {
    console.error('Failed to create test email account:', error);
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
    
    // Log preview URL (for Ethereal emails)
    if (testAccount) {
      console.log(`Email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
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