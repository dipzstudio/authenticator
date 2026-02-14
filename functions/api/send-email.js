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
    const { type, title, message, email, name } = body;

    // Validation
    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
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
    const RECIPIENT_EMAIL = context.env.RECIPIENT_EMAIL; // Your email

    // Prepare email content
    const subject = `[${type.toUpperCase()}] ${title}`;
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #6366F1; border-bottom: 2px solid #6366F1; padding-bottom: 10px;">
              ${type === 'feedback' ? '💬 New Feedback' : '🆘 Support Request'}
            </h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Title:</strong> ${title}</p>
              ${name ? `<p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>` : ''}
              ${email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Type:</strong> ${type}</p>
              <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #555;">Message:</h3>
              <div style="background: #fff; padding: 15px; border-left: 4px solid #6366F1; white-space: pre-wrap;">
${message}
              </div>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              <p>This ${type} was submitted via UnderJoy Authenticator</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
${type === 'feedback' ? 'NEW FEEDBACK' : 'SUPPORT REQUEST'}

Title: ${title}
${name ? `Name: ${name}` : ''}
${email ? `Email: ${email}` : ''}
Type: ${type}
Submitted: ${new Date().toLocaleString()}

Message:
${message}

---
This ${type} was submitted via UnderJoy Authenticator
    `.trim();

    // Try Brevo first
    let result = await sendViaBrevo(
      BREVO_API_KEY,
      RECIPIENT_EMAIL,
      subject,
      htmlContent,
      textContent,
      email || 'noreply@underjoy.com',
      name || 'UnderJoy User'
    );

    if (result.success) {
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
      email || 'noreply@underjoy.com',
      name || 'UnderJoy User'
    );

    if (result.success) {
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
async function sendViaBrevo(apiKey, recipientEmail, subject, htmlContent, textContent, senderEmail, senderName) {
  if (!apiKey || !recipientEmail) {
    return { success: false, error: 'Missing Brevo configuration' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
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
      })
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
async function sendViaSendPulse(clientId, clientSecret, recipientEmail, subject, htmlContent, senderEmail, senderName) {
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

    // Step 2: Send email
    const emailResponse = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
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
      })
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
