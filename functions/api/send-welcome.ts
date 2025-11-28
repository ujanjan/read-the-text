import type { Env } from '../types';

interface SendWelcomeRequest {
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
    const { email } = await context.request.json() as SendWelcomeRequest;

    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Valid email is required' }, 400);
    }

    const BREVO_API_KEY = context.env.BREVO_API_KEY;
    const BREVO_SENDER_EMAIL = context.env.BREVO_SENDER_EMAIL || 'noreply@example.com';
    const BREVO_SENDER_NAME = context.env.BREVO_SENDER_NAME || 'Robin Scholle';

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured');
      return jsonResponse({ error: 'Email service not configured' }, 500);
    }

    // Use Brevo (Sendinblue) API
    console.log(`[MOCK] Email sending disabled. Would send to ${email}`);
    return jsonResponse({
      success: true,
      message: 'Welcome email sent successfully'
    });
    /*
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
        subject: '📖 Welcome to the Reading Comprehension Study',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #1e293b; line-height: 1.7;">
  <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 48px;">📖</span>
      <h1 style="color: #1e293b; font-size: 26px; margin: 16px 0 8px 0;">
        Welcome!
      </h1>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        Thank you for participating in our study
      </p>
    </div>
    
    <!-- About Section -->
    <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 15px;">
        This study is part of the course <strong>DM2730 HT25 – Technology Enhanced Learning</strong> at KTH. The project team consists of <strong>Elias Hedlin</strong>, <strong>Malin Hall</strong>, <strong>Fauzan Helmi Sudaryanto</strong> and <strong>Robin Scholle</strong>.
      </p>
      <p style="margin: 0; font-size: 15px;">
        We are testing a prototype that uses cursor-based "eye" tracking and AI feedback to explore how readers process SWESAT-style (Högskoleprov ELF) texts and how AI can help improve reading comprehension.
      </p>
      <p style="margin: 12px 0 0 0; font-size: 15px; font-weight: 600; color: #0369a1;">
        Your participation helps us evaluate whether AI can support this type of learning.
      </p>
    </div>

    <!-- What You Will Do -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0; display: flex; align-items: center;">
        <span style="margin-right: 8px;">📝</span> What you will do
      </h2>
      <p style="margin: 0 0 12px 0; font-size: 15px;">
        You will read a short English text and answer one multiple-choice question.
      </p>
      <p style="margin: 0 0 12px 0; font-size: 15px;">
        Our system uses the mouse cursor as a stand-in for your eyes. This means:
      </p>
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 12px;">
        <p style="margin: 0; font-size: 15px;">
          <strong>→ We need you to keep the cursor on the exact part of the text you are looking at — at all times.</strong>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #92400e;">
          Where your cursor is pointing = what you are "looking at" for the system.
        </p>
      </div>
      <p style="margin: 0; font-size: 15px;">
        Do not leave the cursor parked in one spot. Move it naturally as your eyes move across the text. We will create a heatmap from your cursor movement to understand how you read and what parts you focus on.
      </p>
    </div>

    <!-- Before You Start -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0; display: flex; align-items: center;">
        <span style="margin-right: 8px;">⚠️</span> Before you start
      </h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px;">
        <li style="margin-bottom: 8px;"><strong>Do NOT use a phone or tablet.</strong> The system will not work correctly.</li>
        <li style="margin-bottom: 8px;">Use a <strong>desktop or laptop</strong>.</li>
        <li style="margin-bottom: 8px;">Use an <strong>external mouse</strong> if possible — it gives far better tracking.</li>
        <li>Make sure you can read <strong>without interruptions</strong>.</li>
      </ul>
    </div>

    <!-- Data Collection -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0; display: flex; align-items: center;">
        <span style="margin-right: 8px;">🔒</span> What data we collect
      </h2>
      <p style="margin: 0 0 12px 0; font-size: 15px;">We only save:</p>
      
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 15px;"><strong>Email</strong></p>
        <p style="margin: 4px 0 0 16px; font-size: 14px; color: #64748b;">
          Used only as your login identifier and to send you your results. It is not used in analysis and is never linked to reading-behaviour data.
        </p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 15px;"><strong>Age, language background, and education level</strong></p>
        <p style="margin: 4px 0 0 16px; font-size: 14px; color: #64748b;">
          Anonymous survey data for analysis.
        </p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 15px;"><strong>Reading behaviour</strong></p>
        <ul style="margin: 4px 0 0 16px; padding-left: 20px; font-size: 14px; color: #64748b;">
          <li>Your cursor movements (representing where you looked)</li>
          <li>The time you spent reading</li>
          <li>Your answer and the AI feedback you received</li>
        </ul>
      </div>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          <strong>✓</strong> We do not collect your name, IP address, or any identifiable personal information.<br>
          <strong>✓</strong> All collected data is anonymous and used only for this course project.
        </p>
      </div>
    </div>

    <!-- Consent -->
    <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0; display: flex; align-items: center;">
        <span style="margin-right: 8px;">✅</span> Consent
      </h2>
      <p style="margin: 0 0 12px 0; font-size: 15px;">
        By clicking Start, you confirmed that:
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px;">
        <li style="margin-bottom: 4px;">you understand the information above</li>
        <li style="margin-bottom: 4px;">you agree to anonymous participation</li>
        <li>we may use the collected data for this course project</li>
      </ul>
    </div>

    <!-- Thank You -->
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">
        🎉 Thank you for helping us test this reading-support prototype!
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
      DM2730 Technology Enhanced Learning • KTH Royal Institute of Technology
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
        error: 'Failed to send welcome email',
        details: errorText
      }, 500);
    }
    */

    return jsonResponse({
      success: true,
      message: 'Welcome email sent successfully'
    });

  } catch (error: any) {
    console.error('Send welcome email error:', error);
    return jsonResponse({
      error: 'Failed to send welcome email',
      details: error.message
    }, 500);
  }
};
