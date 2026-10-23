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

/** Sends an email. Returns false when no provider is configured (nothing sent). */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "MD Genius Launchpad <no-reply@mdgeniusai.com>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      // Never log the body in production: it contains single-use login links.
      console.warn(`[email] RESEND_API_KEY not set; dropped "${message.subject}" to ${message.to}.`);
    } else {
      console.log(`[email] RESEND_API_KEY not set; not sending "${message.subject}" to ${message.to}.\n${message.text}`);
    }
    return false;
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
  return true;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Origin of the link (so the logo loads from the same deployment), falling back to the app base URL. */
function assetBase(link: string): string {
  try {
    return new URL(link).origin;
  } catch {
    return appBaseUrl();
  }
}

const FONT = "Helvetica, 'Helvetica Neue', Arial, sans-serif";

/**
 * Branded table layout shared by the transactional emails: White Smoke canvas, white 12px card,
 * Launchpad logo, navy text and a navy button. `bodyHtml` must already be escaped.
 */
function brandedHtml(opts: { link: string; bodyHtml: string; buttonLabel: string; afterButtonHtml?: string }): string {
  const href = escapeHtml(opts.link);
  const logo = escapeHtml(`${assetBase(opts.link)}/brand/launchpad-logo-compact-color@2x.png`);
  return `<!doctype html><html><body style="margin:0;padding:0;background-color:#F3F3F3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F3F3;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #D5DEE2;border-radius:12px;">
<tr><td style="padding:32px 32px 8px 32px;"><img src="${logo}" width="175" height="28" alt="MD Genius Launchpad" style="display:block;border:0;outline:none;text-decoration:none;width:175px;height:28px;"></td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:${FONT};font-size:16px;line-height:1.55;color:#082B42;">${opts.bodyHtml}</td></tr>
<tr><td style="padding:8px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#082B42;border-radius:8px;">
<a href="${href}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:500;color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(opts.buttonLabel)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 32px 32px;font-family:${FONT};font-size:14px;line-height:1.55;color:#082B42;">${opts.afterButtonHtml ?? ""}<p style="margin:0;color:#5F6B74;font-size:13px;">If the button does not work, copy this link into your browser:<br><a href="${href}" style="color:#3A607D;word-break:break-all;">${href}</a></p></td></tr>
</table>
<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#5F6B74;">MD Genius Launchpad &middot; an MDGeniusAI program</p>
</td></tr>
</table>
</body></html>`;
}

export function passwordResetEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Reset your MD Genius Launchpad password",
    text: `We received a request to reset your password.\n\nSet a new password here (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    html: brandedHtml({
      link,
      bodyHtml: `<p style="margin:0 0 16px 0;">We received a request to reset your password.</p><p style="margin:0 0 16px 0;">Use the button below to set a new password. The link is valid for 1 hour.</p>`,
      buttonLabel: "Set a new password",
      afterButtonHtml: `<p style="margin:0 0 16px 0;">If you did not ask for this, you can ignore this email.</p>`,
    }),
  };
}

export function inviteEmail(to: string, link: string, inviterName: string): EmailMessage {
  const who = inviterName || "An administrator";
  return {
    to,
    subject: "You're invited to MD Genius Launchpad",
    text: `${who} invited you to MD Genius Launchpad.\n\nSet your password to activate your account (valid for 7 days):\n${link}`,
    html: brandedHtml({
      link,
      bodyHtml: `<p style="margin:0 0 16px 0;">${escapeHtml(who)} invited you to MD Genius Launchpad.</p><p style="margin:0 0 16px 0;">Set your password to activate your account. The link is valid for 7 days.</p>`,
      buttonLabel: "Set your password",
    }),
  };
}
