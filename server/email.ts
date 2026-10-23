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

export type EmailLocale = "en" | "es";

/** Normalizes a stored locale; anything unknown gets English. */
export function emailLocale(value: unknown): EmailLocale {
  return value === "es" ? "es" : "en";
}

const SHARED = {
  en: {
    fallbackLink: "If the button does not work, copy this link into your browser:",
    footer: "MD Genius Launchpad &middot; an MDGeniusAI program",
  },
  es: {
    fallbackLink: "Si el botón no funciona, copia este enlace en tu navegador:",
    footer: "MD Genius Launchpad &middot; un programa de MDGeniusAI",
  },
} as const;

/**
 * Branded table layout shared by the transactional emails: White Smoke canvas, white 12px card,
 * Launchpad logo, navy text and a navy button. `bodyHtml` must already be escaped.
 */
function brandedHtml(opts: {
  link: string;
  bodyHtml: string;
  buttonLabel: string;
  afterButtonHtml?: string;
  locale: EmailLocale;
}): string {
  const href = escapeHtml(opts.link);
  const logo = escapeHtml(`${assetBase(opts.link)}/brand/launchpad-logo-compact-color@2x.png`);
  const shared = SHARED[opts.locale];
  return `<!doctype html><html lang="${opts.locale}"><body style="margin:0;padding:0;background-color:#F3F3F3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F3F3;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #D5DEE2;border-radius:12px;">
<tr><td style="padding:32px 32px 8px 32px;"><img src="${logo}" width="175" height="28" alt="MD Genius Launchpad" style="display:block;border:0;outline:none;text-decoration:none;width:175px;height:28px;"></td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:${FONT};font-size:16px;line-height:1.55;color:#082B42;">${opts.bodyHtml}</td></tr>
<tr><td style="padding:8px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#082B42;border-radius:999px;">
<a href="${href}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:500;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(opts.buttonLabel)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 32px 32px;font-family:${FONT};font-size:14px;line-height:1.55;color:#082B42;">${opts.afterButtonHtml ?? ""}<p style="margin:0;color:#5F6B74;font-size:13px;">${shared.fallbackLink}<br><a href="${href}" style="color:#3A607D;word-break:break-all;">${href}</a></p></td></tr>
</table>
<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#5F6B74;">${shared.footer}</p>
</td></tr>
</table>
</body></html>`;
}

const RESET = {
  en: {
    subject: "Reset your MD Genius Launchpad password",
    intro: "We received a request to reset your password.",
    body: "Use the button below to set a new password. The link is valid for 1 hour.",
    textBody: "Set a new password here (valid for 1 hour):",
    button: "Set a new password",
    ignore: "If you did not ask for this, you can ignore this email.",
  },
  es: {
    subject: "Restablece tu contraseña de MD Genius Launchpad",
    intro: "Recibimos una solicitud para restablecer tu contraseña.",
    body: "Usa el botón de abajo para crear una contraseña nueva. El enlace es válido por 1 hora.",
    textBody: "Crea una contraseña nueva aquí (válido por 1 hora):",
    button: "Crear una contraseña nueva",
    ignore: "Si no lo pediste, puedes ignorar este correo.",
  },
} as const;

export function passwordResetEmail(to: string, link: string, locale: EmailLocale = "en"): EmailMessage {
  const c = RESET[locale];
  return {
    to,
    subject: c.subject,
    text: `${c.intro}\n\n${c.textBody}\n${link}\n\n${c.ignore}`,
    html: brandedHtml({
      link,
      locale,
      bodyHtml: `<p style="margin:0 0 16px 0;">${c.intro}</p><p style="margin:0 0 16px 0;">${c.body}</p>`,
      buttonLabel: c.button,
      afterButtonHtml: `<p style="margin:0 0 16px 0;">${c.ignore}</p>`,
    }),
  };
}

const INVITE = {
  en: {
    subject: "You're invited to MD Genius Launchpad",
    someone: "An administrator",
    invited: (who: string) => `${who} invited you to MD Genius Launchpad.`,
    body: "Set your password to activate your account. The link is valid for 7 days.",
    textBody: "Set your password to activate your account (valid for 7 days):",
    button: "Set your password",
  },
  es: {
    subject: "Te invitaron a MD Genius Launchpad",
    someone: "Una persona del equipo administrador",
    invited: (who: string) => `${who} te invitó a MD Genius Launchpad.`,
    body: "Crea tu contraseña para activar tu cuenta. El enlace es válido por 7 días.",
    textBody: "Crea tu contraseña para activar tu cuenta (válido por 7 días):",
    button: "Crear mi contraseña",
  },
} as const;

export function inviteEmail(to: string, link: string, inviterName: string, locale: EmailLocale = "en"): EmailMessage {
  const c = INVITE[locale];
  const who = inviterName || c.someone;
  return {
    to,
    subject: c.subject,
    text: `${c.invited(who)}\n\n${c.textBody}\n${link}`,
    html: brandedHtml({
      link,
      locale,
      bodyHtml: `<p style="margin:0 0 16px 0;">${c.invited(escapeHtml(who))}</p><p style="margin:0 0 16px 0;">${c.body}</p>`,
      buttonLabel: c.button,
    }),
  };
}
