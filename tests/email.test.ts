import { describe, expect, it } from "vitest";
import { emailLocale, inviteEmail, passwordResetEmail } from "../server/email";

describe("transactional emails", () => {
  it("renders the reset email in English by default and in Spanish on request", () => {
    const en = passwordResetEmail("a@test.local", "https://example.com/reset?token=1");
    expect(en.subject).toBe("Reset your MD Genius Launchpad password");
    expect(en.html).toContain('lang="en"');

    const es = passwordResetEmail("a@test.local", "https://example.com/reset?token=1", "es");
    expect(es.subject).toBe("Restablece tu contraseña de MD Genius Launchpad");
    expect(es.text).toContain("restablecer tu contraseña");
    expect(es.html).toContain('lang="es"');
    expect(es.html).toContain("un programa de MDGeniusAI");
    expect(`${es.subject} ${es.text}`).not.toMatch(/[¡!]/);
  });

  it("escapes the inviter name in both languages", () => {
    const es = inviteEmail("b@test.local", "https://example.com/r?token=2", "<Ada>", "es");
    expect(es.subject).toBe("Te invitaron a MD Genius Launchpad");
    expect(es.html).toContain("&lt;Ada&gt; te invitó");
    expect(es.html).not.toContain("<Ada>");
  });

  it("falls back to English for unknown locales", () => {
    expect(emailLocale("fr")).toBe("en");
    expect(emailLocale(null)).toBe("en");
    expect(emailLocale("es")).toBe("es");
  });
});
