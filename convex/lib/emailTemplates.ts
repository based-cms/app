/**
 * HTML email templates for auth flows.
 * Inline CSS for email client compatibility.
 */

type OtpType = 'email-verification' | 'sign-in' | 'forget-password'

const otpTitles: Record<OtpType, string> = {
  'email-verification': 'Verify your email',
  'sign-in': 'Your sign-in code',
  'forget-password': 'Reset your password',
}

const otpDescriptions: Record<OtpType, string> = {
  'email-verification': 'Enter this code to verify your email address:',
  'sign-in': 'Enter this code to sign in to Based CMS:',
  'forget-password': 'Enter this code to reset your password:',
}

export function otpEmail(
  otp: string,
  type: OtpType
): { subject: string; html: string } {
  const title = otpTitles[type]
  return {
    subject: title,
    html: baseLayout(
      title,
      `
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">${otpDescriptions[type]}</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;font-size:32px;letter-spacing:8px;font-family:'Courier New',Courier,monospace;font-weight:700;color:#09090b;background:#f4f4f5;padding:12px 20px;border-radius:8px;border:1px solid #e4e4e7;">
          ${otp}
        </span>
      </div>
      <p style="margin:0;color:#71717a;font-size:13px;">This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
    `
    ),
  }
}

export function magicLinkEmail(url: string): { subject: string; html: string } {
  const title = 'Sign in to Based CMS'
  return {
    subject: title,
    html: baseLayout(
      title,
      `
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Click the button below to sign in to your Based CMS account:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 32px;background:#09090b;color:#fafafa;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
          Sign in to Based CMS
        </a>
      </div>
      <p style="margin:0 0 8px;color:#71717a;font-size:13px;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 16px;word-break:break-all;"><a href="${url}" style="color:#2563eb;font-size:13px;">${url}</a></p>
      <p style="margin:0;color:#71717a;font-size:13px;">This link expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
    `
    ),
  }
}

export function resetPasswordEmail(
  url: string
): { subject: string; html: string } {
  const title = 'Reset your password'
  return {
    subject: title,
    html: baseLayout(
      title,
      `
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Click the button below to reset your Based CMS password:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 32px;background:#09090b;color:#fafafa;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
          Reset password
        </a>
      </div>
      <p style="margin:0 0 8px;color:#71717a;font-size:13px;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 16px;word-break:break-all;"><a href="${url}" style="color:#2563eb;font-size:13px;">${url}</a></p>
      <p style="margin:0;color:#71717a;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `
    ),
  }
}

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;width:32px;height:32px;line-height:32px;background:#09090b;color:#fafafa;border-radius:6px;font-size:14px;font-weight:700;text-align:center;vertical-align:middle;">B</span>
      <span style="margin-left:8px;font-size:18px;font-weight:600;color:#09090b;vertical-align:middle;">Based CMS</span>
    </div>
    <h1 style="font-size:20px;font-weight:600;color:#09090b;margin:0 0 16px;">${title}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
    <p style="font-size:12px;color:#a1a1aa;text-align:center;margin:0;">Based CMS &mdash; Headless content, simplified.</p>
  </div>
</body></html>`
}
