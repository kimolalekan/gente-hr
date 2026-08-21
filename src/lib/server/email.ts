/**
 * Email provider abstraction for OTP delivery.
 *
 * - `RESEND_API_KEY` set  → delivers via the Resend API (no extra dependency).
 * - Otherwise             → "console" provider, used for development mode.
 * Any provider failure falls back to the console so sign-in never hard-fails.
 */
import 'server-only';

export interface OtpEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
}

export interface OtpDelivery {
  channel: 'email' | 'console';
  provider: string;
}

const RESEND_URL = 'https://api.resend.com/emails';

function buildOtpHtml(input: OtpEmailInput): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:32px 0">
    <table role="presentation" width="100%"><tr><td align="center">
      <table role="presentation" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <tr>
          <td style="padding:24px 32px;background:#2563eb">
            <span style="color:#ffffff;font-size:18px;font-weight:700">Gente HR</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 8px;font-size:20px;color:#1e293b">Your sign-in code</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b">Use the code below to sign in to Gente. It expires in ${input.expiresInMinutes} minutes.</p>
            <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb;text-align:center;padding:16px;background:#eff6ff;border-radius:8px">${input.code}</p>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">If you didn't request this code, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </td></tr></table>
  </body>
</html>`;
}

async function sendViaResend(input: OtpEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  const from = process.env.RESEND_FROM ?? 'Gente <onboarding@resend.dev>';
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: 'Your Gente sign-in code',
      html: buildOtpHtml(input),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

function sendViaConsole(input: OtpEmailInput): void {
  const line = '─'.repeat(46);
  console.log(`\n${line}`);
  console.log('  GENTE — SIGN-IN CODE (development console provider)');
  console.log(line);
  console.log(`  To:      ${input.to}`);
  console.log(`  Code:    ${input.code}`);
  console.log(`  Expires: in ${input.expiresInMinutes} minutes`);
  console.log(`${line}\n`);
}

export async function sendOtpEmail(input: OtpEmailInput): Promise<OtpDelivery> {
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend(input);
      return { channel: 'email', provider: 'resend' };
    } catch (error) {
      console.warn('[auth] Email delivery failed; falling back to console provider.', error);
    }
  }
  sendViaConsole(input);
  return { channel: 'console', provider: 'console' };
}
