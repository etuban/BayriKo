import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY environment variable is not set. Email functionality will not work.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailData {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key not set. Email not sent.');
      return false;
    }

    await sgMail.send(emailData);
    console.log(`Email sent successfully to ${emailData.to}`);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
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
  const from = 'noreply@bayriko.app'; // Replace with your verified sender
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