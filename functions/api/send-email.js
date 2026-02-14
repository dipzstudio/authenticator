/**
 * Cloudflare Pages Function - Email Handler
 * Handles both feedback and support requests
 * Primary: Brevo API
 * Fallback: SendPulse API
 */

export async function onRequestPost(context) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await context.request.json();
    const { type, title, message, email, name, submittedAt, ipAddress, city, country } = body;

    // Validation
    if (!message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Message is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get API keys from environment variables
    const BREVO_API_KEY = context.env.BREVO_API_KEY;
    const SENDPULSE_ID = context.env.SENDPULSE_ID;
    const SENDPULSE_SECRET = context.env.SENDPULSE_SECRET;
    const RECIPIENT_EMAIL = context.env.RECIPIENT_EMAIL; // Your admin email
    const NOREPLY_EMAIL = context.env.NOREPLY_EMAIL || 'noreply-auth@underjoy.in'; // Auto-reply sender

    // Use user's email and name, with fallbacks
    const userName = name || 'Anonymous User';
    const userEmail = email || 'anonymous@underjoy.in';

    // Prepare email content for ADMIN
    const subject = `[${type.toUpperCase()}] from ${userName}`;
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #6366F1; border-bottom: 2px solid #6366F1; padding-bottom: 10px;">
              ${type === 'feedback' ? '💬 New Feedback' : '🆘 Support Request'}
            </h2>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #555;">Message:</h3>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #6366F1; white-space: pre-wrap;">
${message}
              </div>
            </div>
            
            <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 5px 0;"><strong>Submitted:</strong> ${submittedAt || new Date().toLocaleString()}</p>
              ${ipAddress ? `<p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
              ${city && country ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${city}, ${country}</p>` : ''}
              <p style="margin: 5px 0;"><strong>User:</strong> ${userName} ${email ? `(${email})` : ''}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              <p>This ${type} was submitted via UnderJoy Authenticator</p>
              ${email ? `<p>You can reply directly to this email to respond to the user at ${email}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
${type === 'feedback' ? 'NEW FEEDBACK' : 'SUPPORT REQUEST'}

Message:
${message}

---

Submitted: ${submittedAt || new Date().toLocaleString()}
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${city && country ? `Location: ${city}, ${country}` : ''}
User: ${userName} ${email ? `(${email})` : ''}

---
This ${type} was submitted via UnderJoy Authenticator
${email ? `You can reply to: ${email}` : ''}
    `.trim();

    // Try Brevo first - Send to admin
    // IMPORTANT: Email FROM user so admin can reply directly
    let result = await sendViaBrevo(
      BREVO_API_KEY,
      RECIPIENT_EMAIL,
      subject,
      htmlContent,
      textContent,
      userEmail,
      userName,
      email // replyTo - ensures admin can reply even if sender is default
    );

    if (result.success) {
      // Send acknowledgment email to user (if email provided)
      if (email && email !== 'anonymous@underjoy.in') {
        await sendAcknowledgmentEmail(
          BREVO_API_KEY,
          SENDPULSE_ID,
          SENDPULSE_SECRET,
          email,
          userName,
          type,
          message,
          NOREPLY_EMAIL
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully via Brevo',
          provider: 'brevo'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fallback to SendPulse
    console.log('Brevo failed, trying SendPulse...', result.error);
    
    result = await sendViaSendPulse(
      SENDPULSE_ID,
      SENDPULSE_SECRET,
      RECIPIENT_EMAIL,
      subject,
      htmlContent,
      userEmail,
      userName,
      email // replyTo
    );

    if (result.success) {
      // Send acknowledgment email to user (if email provided)
      if (email && email !== 'anonymous@underjoy.in') {
        await sendAcknowledgmentEmail(
          BREVO_API_KEY,
          SENDPULSE_ID,
          SENDPULSE_SECRET,
          email,
          userName,
          type,
          message,
          NOREPLY_EMAIL
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully via SendPulse',
          provider: 'sendpulse'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Both failed
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to send email via both providers',
        details: result.error
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Send email via Brevo (formerly Sendinblue)
 */
async function sendViaBrevo(apiKey, recipientEmail, subject, htmlContent, textContent, senderEmail, senderName, replyTo) {
  if (!apiKey || !recipientEmail) {
    return { success: false, error: 'Missing Brevo configuration' };
  }

  try {
    const emailPayload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: recipientEmail,
          name: 'UnderJoy Admin'
        }
      ],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent
    };

    // Add replyTo if provided (so admin can reply to user)
    if (replyTo && replyTo !== 'anonymous@underjoy.in') {
      emailPayload.replyTo = {
        email: replyTo,
        name: senderName
      };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      return { 
        success: false, 
        error: data.message || 'Brevo API error',
        code: data.code
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send email via SendPulse
 */
async function sendViaSendPulse(clientId, clientSecret, recipientEmail, subject, htmlContent, senderEmail, senderName, replyTo) {
  if (!clientId || !clientSecret || !recipientEmail) {
    return { success: false, error: 'Missing SendPulse configuration' };
  }

  try {
    // Step 1: Get access token
    const tokenResponse = await fetch('https://api.sendpulse.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return { 
        success: false, 
        error: 'Failed to get SendPulse token',
        details: tokenData
      };
    }

    // Prepare email payload
    const emailPayload = {
      email: {
        html: htmlContent,
        text: htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text
        subject: subject,
        from: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: recipientEmail
          }
        ]
      }
    };

    // Add reply_to if provided
    if (replyTo && replyTo !== 'anonymous@underjoy.in') {
      emailPayload.email.reply_to = {
        email: replyTo,
        name: senderName
      };
    }

    // Step 2: Send email
    const emailResponse = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify(emailPayload)
    });

    const emailData = await emailResponse.json();

    if (emailResponse.ok) {
      return { success: true, data: emailData };
    } else {
      return { 
        success: false, 
        error: emailData.message || 'SendPulse API error',
        details: emailData
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send acknowledgment email to user
 */
async function sendAcknowledgmentEmail(brevoApiKey, sendpulseId, sendpulseSecret, userEmail, userName, type, message, noreplyEmail) {
  const isSupport = type === 'support';
  const subject = isSupport 
    ? '✓ Support Request Received - UnderJoy Authenticator'
    : '✓ Feedback Received - UnderJoy Authenticator';
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
            <h2 style="color: white; margin: 0; text-align: center;">
              ${isSupport ? '🆘 Support Request Acknowledgment' : '💬 Feedback Acknowledgment'}
            </h2>
          </div>
          
          <p style="font-size: 16px;">Hello ${userName},</p>
          
          <p>Thank you for contacting us! We have successfully received your ${isSupport ? 'support request' : 'feedback'}.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6366F1;">
            <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>What you submitted:</strong></p>
            <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px; font-size: 14px; white-space: pre-wrap;">
${message}
            </div>
          </div>
          
          ${isSupport ? `
          <div style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
            <p style="margin: 0; color: #0c4a6e;">
              <strong>🔧 Next Steps:</strong><br>
              Our support team is reviewing your request. You will receive a response from us at this email address within 24-48 hours.
            </p>
          </div>
          ` : `
          <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e3a8a;">
              <strong>💙 Thank You!</strong><br>
              Your feedback helps us make UnderJoy Authenticator better for everyone. We carefully review all feedback and use it to improve our app.
            </p>
          </div>
          `}
          
          <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Important:</strong> This is an automated acknowledgment email. Please do not reply to this email. ${isSupport ? 'You will receive a response from our support team separately.' : ''}
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 5px 0;">UnderJoy Authenticator</p>
            <p style="margin: 5px 0;">Secure • Simple • Reliable</p>
            <p style="margin: 5px 0; color: #999;">This email was sent to ${userEmail}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
${isSupport ? 'SUPPORT REQUEST ACKNOWLEDGMENT' : 'FEEDBACK ACKNOWLEDGMENT'}

Hello ${userName},

Thank you for contacting us! We have successfully received your ${isSupport ? 'support request' : 'feedback'}.

WHAT YOU SUBMITTED:
${message}

${isSupport ? `NEXT STEPS:
Our support team is reviewing your request. You will receive a response from us at this email address within 24-48 hours.` : `THANK YOU!
Your feedback helps us make UnderJoy Authenticator better for everyone. We carefully review all feedback and use it to improve our app.`}

IMPORTANT: This is an automated acknowledgment email. Please do not reply to this email. ${isSupport ? 'You will receive a response from our support team separately.' : ''}

---
UnderJoy Authenticator
Secure • Simple • Reliable
This email was sent to ${userEmail}
  `.trim();

  // Try Brevo first for acknowledgment
  let result = await sendViaBrevo(
    brevoApiKey,
    userEmail,
    subject,
    htmlContent,
    textContent,
    noreplyEmail,
    'UnderJoy Authenticator'
  );

  if (result.success) {
    console.log('Acknowledgment email sent via Brevo to:', userEmail);
    return { success: true };
  }

  // Fallback to SendPulse for acknowledgment
  console.log('Brevo failed for acknowledgment, trying SendPulse...');
  result = await sendViaSendPulse(
    sendpulseId,
    sendpulseSecret,
    userEmail,
    subject,
    htmlContent,
    noreplyEmail,
    'UnderJoy Authenticator'
  );

  if (result.success) {
    console.log('Acknowledgment email sent via SendPulse to:', userEmail);
    return { success: true };
  }

  console.error('Failed to send acknowledgment email:', result.error);
  return { success: false, error: result.error };
}
