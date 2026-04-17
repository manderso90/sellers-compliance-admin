export function buildInviteEmailHtml(data: {
  employeeName: string
  setupUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're Invited — Seller's Compliance</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F5F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: #C8102E; padding: 28px 32px; vertical-align: middle;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">Seller's Compliance</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #FFD4DB;">Team Invitation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #2B2B2B;">You've been invited!</h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525B;">
                Hi${data.employeeName ? ` ${data.employeeName}` : ''},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525B;">
                You've been invited to join <strong>Seller's Compliance</strong> as a team member. Click the button below to set up your password and access your account.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${data.setupUrl}" style="display: inline-block; background-color: #C8102E; color: #FFFFFF; padding: 16px 48px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold;">
                Set Up Your Account
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 2px solid #D4AF37; margin: 0;" />
            </td>
          </tr>

          <!-- Help text -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #71717A;">
                This link will expire in 24 hours. If it has expired, ask your administrator to send a new invitation.
              </p>
              <p style="margin: 0; font-size: 13px; color: #71717A;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAFAFA; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #2B2B2B;">Seller's Compliance</p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #71717A;">Fast. Simple. Frictionless.</p>
              <p style="margin: 0; font-size: 12px; color: #A1A1AA;">
                <a href="mailto:info@sellerscompliance.com" style="color: #C8102E; text-decoration: none;">info@sellerscompliance.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
