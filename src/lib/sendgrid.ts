import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY || "";
const fromEmail = process.env.SENDGRID_FROM_EMAIL || "";

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendMagicLinkEmail(to: string, magicLink: string) {
  console.log("=== SendGrid Email Debug ===");
  console.log("SendGrid API Key configured:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");
  console.log("SendGrid From Email:", fromEmail);
  console.log("Recipient:", to);
  console.log("Magic Link:", magicLink);

  if (!apiKey || !fromEmail) {
    console.error("SendGrid not configured - missing API key or from email");
    return false;
  }

  try {
    console.log("Attempting to send email via SendGrid...");
    const result = await sgMail.send({
      to,
      from: fromEmail,
      subject: "Sign in to HeySalad Laura",
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false
        },
        openTracking: {
          enable: false
        }
      },
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign in to Laura</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 40px;">
              <h1 style="color: #ed4c4c; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">HeySalad Laura</h1>
              <p style="color: #faa09a; font-size: 16px; margin: 0 0 30px 0;">Logistics Command Center</p>
              
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Click the button below to sign in to your account. This link will expire in 15 minutes.
              </p>
              
              <a href="${magicLink}" style="display: inline-block; background-color: #ed4c4c; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Sign in to Laura
              </a>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 40px 0 0 0;">
                If you didn't request this email, you can safely ignore it.
              </p>
              
              <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
              
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                HeySalad Logistics &copy; ${new Date().getFullYear()}
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Sign in to HeySalad Laura\n\nClick this link to sign in: ${magicLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`
    });
    console.log("Email sent successfully via SendGrid!");
    console.log("SendGrid response:", JSON.stringify(result, null, 2));
    return true;
  } catch (error: any) {
    console.error("===== SendGrid error =====");
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error response:", JSON.stringify(error?.response?.body, null, 2));
    console.error("Full error:", error);
    return false;
  }
}
