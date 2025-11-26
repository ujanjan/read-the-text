import type { Env } from '../types';

interface SendLinkRequest {
  email: string;
}

// Helper to create JSON responses
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { email } = await context.request.json() as SendLinkRequest;

    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Valid email is required' }, 400);
    }

    const BREVO_API_KEY = context.env.BREVO_API_KEY;
    const BREVO_SENDER_EMAIL = context.env.BREVO_SENDER_EMAIL || 'noreply@example.com';
    const BREVO_SENDER_NAME = context.env.BREVO_SENDER_NAME || 'Robin Scholle';

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured');
      return jsonResponse({ error: 'Email service not configured. Please check .dev.vars file.' }, 500);
    }

    // Get the study URL from the request origin
    const origin = new URL(context.request.url).origin;
    const studyUrl = origin;

    // Use Brevo (Sendinblue) API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          { email: email }
        ],
        subject: '📖 Complete Your Reading Comprehension Study',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
  <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 48px;">📖</span>
    </div>
    
    <h1 style="color: #1e293b; font-size: 24px; text-align: center; margin-bottom: 16px;">
      Reading Comprehension Study
    </h1>
    
    <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
      You requested a link to complete the study on your desktop. Click the button below to get started!
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${studyUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        🚀 Start the Study
      </a>
    </div>
    
    <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #0369a1; font-size: 14px; margin: 0;">
        <strong>💡 Remember:</strong> This study requires a desktop or laptop computer with a mouse. Please follow the text with your cursor as you read.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
      DM2730 Technology Enhanced Learning • KTH Royal Institute of Technology
    </p>
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 8px;">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo API error:', response.status, errorText);
      return jsonResponse({
        error: 'Failed to send email. Please try again later.',
        details: errorText
      }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error: any) {
    console.error('Send link error:', error);
    return jsonResponse({
      error: 'Failed to send email',
      details: error.message
    }, 500);
  }
};
