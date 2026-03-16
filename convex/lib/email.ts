/**
 * Abstracted email transport — Resend REST API via fetch.
 * Runs in Convex HTTP action runtime (no Node SDK).
 * Swap to AWS SES later by replacing the body of sendEmail.
 */

export interface EmailMessage {
  to: string
  subject: string
  html: string
  from?: string
}

interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

export async function sendEmail(msg: EmailMessage): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not set')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const from =
    msg.from ?? process.env.EMAIL_FROM ?? 'Based CMS <noreply@based-cms.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[email] Resend error ${res.status}: ${body}`)
      return { success: false, error: `Resend ${res.status}: ${body}` }
    }

    const data = (await res.json()) as { id: string }
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[email] fetch error:', err)
    return { success: false, error: String(err) }
  }
}
