/**
 * Transactional email via Resend's HTTP API (https://resend.com).
 *
 * Without RESEND_API_KEY, emails are logged instead of sent so local
 * development and tests work. In production this is logged as a warning,
 * because users will not receive reset or invite links.
 */
interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "MD Genius Launchpad <no-reply@mdgeniusai.com>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      // Never log the body in production: it contains single-use login links.
      console.warn(`[email] RESEND_API_KEY not set; dropped "${message.subject}" to ${message.to}.`);
    } else {
      console.log(`[email] RESEND_API_KEY not set; not sending "${message.subject}" to ${message.to}.\n${message.text}`);
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function passwordResetEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Reset your MD Genius Launchpad password",
    text: `We received a request to reset your password.\n\nSet a new password here (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    html: `<p>We received a request to reset your password.</p><p><a href="${escapeHtml(link)}">Set a new password</a> (valid for 1 hour).</p><p>If you did not ask for this, you can ignore this email.</p>`,
  };
}

export function inviteEmail(to: string, link: string, inviterName: string): EmailMessage {
  const who = inviterName || "An administrator";
  return {
    to,
    subject: "You're invited to MD Genius Launchpad",
    text: `${who} invited you to MD Genius Launchpad.\n\nSet your password to activate your account (valid for 7 days):\n${link}`,
    html: `<p>${escapeHtml(who)} invited you to MD Genius Launchpad.</p><p><a href="${escapeHtml(link)}">Set your password</a> to activate your account (valid for 7 days).</p>`,
  };
}
