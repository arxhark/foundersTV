// Email sending via Resend. If RESEND_API_KEY is not configured the email is
// logged to the console and the magic link is returned to the caller instead,
// so local development works without an email provider.
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  // eslint-disable-next-line global-require
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM || 'FoundersTV <onboarding@resend.dev>';

const sendMagicLink = async (to, link) => {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px; background:#0A0A0F; color:#F0F0F5; border-radius:16px;">
      <h1 style="color:#6C63FF; font-size:22px; margin:0 0 8px;">▶ FoundersTV</h1>
      <p style="color:#9CA3AF; font-size:14px;">Tap the button below to sign in. This link expires in 15 minutes.</p>
      <a href="${link}" style="display:inline-block; background:#6C63FF; color:#fff; text-decoration:none; font-weight:600; padding:12px 24px; border-radius:12px; margin:16px 0;">Sign in to FoundersTV</a>
      <p style="color:#4B5563; font-size:12px;">If you didn't request this, you can ignore this email.</p>
    </div>`;

  if (!resendClient) {
    console.log(`\n[email disabled] Magic link for ${to}:\n${link}\n`);
    return { delivered: false, link };
  }

  await resendClient.emails.send({
    from: FROM,
    to,
    subject: 'Your FoundersTV sign-in link',
    html,
  });
  return { delivered: true };
};

module.exports = { sendMagicLink, emailEnabled: !!resendClient };
