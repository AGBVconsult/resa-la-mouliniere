import { describe, expect, test } from "vitest";

import { computeBackoffMs, shouldMarkFailed, MAX_ATTEMPTS } from "../convex/lib/email/retry";
import { renderTemplate, escapeHtml, type TemplateData } from "../convex/lib/email/templates";

describe("computeBackoffMs", () => {
  test("attempt 1 returns 60000 (1 min)", () => {
    expect(computeBackoffMs(1)).toBe(60_000);
  });

  test("attempt 2 returns 120000 (2 min)", () => {
    expect(computeBackoffMs(2)).toBe(120_000);
  });

  test("attempt 3 returns 240000 (4 min)", () => {
    expect(computeBackoffMs(3)).toBe(240_000);
  });

  test("attempt 4 returns 480000 (8 min)", () => {
    expect(computeBackoffMs(4)).toBe(480_000);
  });

  test("attempt 5 returns 960000 (16 min)", () => {
    expect(computeBackoffMs(5)).toBe(960_000);
  });

  test("attempt 0 returns null (invalid)", () => {
    expect(computeBackoffMs(0)).toBeNull();
  });

  test("attempt 6 returns null (exceeded max)", () => {
    expect(computeBackoffMs(6)).toBeNull();
  });

  test("negative attempt returns null", () => {
    expect(computeBackoffMs(-1)).toBeNull();
  });
});

describe("shouldMarkFailed", () => {
  test("returns false for attemptCount < MAX_ATTEMPTS", () => {
    expect(shouldMarkFailed(0)).toBe(false);
    expect(shouldMarkFailed(1)).toBe(false);
    expect(shouldMarkFailed(4)).toBe(false);
  });

  test("returns true for attemptCount >= MAX_ATTEMPTS", () => {
    expect(shouldMarkFailed(MAX_ATTEMPTS)).toBe(true);
    expect(shouldMarkFailed(MAX_ATTEMPTS + 1)).toBe(true);
  });
});

describe("escapeHtml", () => {
  test("escapes < and >", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  test("escapes &", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  test("escapes quotes", () => {
    expect(escapeHtml('"test"')).toBe("&quot;test&quot;");
    expect(escapeHtml("'test'")).toBe("&#039;test&#039;");
  });

  test("handles XSS attempt in firstName", () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});

describe("renderTemplate", () => {
  const baseData: TemplateData = {
    firstName: "Jean",
    lastName: "Dupont",
    dateKey: "2024-12-25",
    timeKey: "12:30",
    service: "lunch",
    partySize: 4,
    language: "fr",
    manageUrl: "https://example.com/reservation/abc123",
  };

  test("renders confirmed template with subject and html", () => {
    const result = renderTemplate("reservation.confirmed", "fr", baseData);
    expect(result.subject).toBe("Votre réservation est confirmée");
    expect(result.html).toContain("Jean");
    expect(result.html).toContain("Dupont");
    expect(result.html).toContain("2024-12-25");
    expect(result.html).toContain("12:30");
  });

  test("renders pending template", () => {
    const result = renderTemplate("reservation.pending", "fr", baseData);
    expect(result.subject).toBe("Votre demande de réservation");
    expect(result.html).toContain("en attente");
  });

  test("renders cancelled template", () => {
    const result = renderTemplate("reservation.cancelled", "fr", baseData);
    expect(result.subject).toBe("Votre réservation a été annulée");
  });

  test("locale fallback to en for unsupported locale", () => {
    // Cast to bypass type check for testing fallback
    const result = renderTemplate("reservation.confirmed", "xx" as any, baseData);
    expect(result.subject).toBe("Your reservation is confirmed");
  });

  test("locale nl works", () => {
    const result = renderTemplate("reservation.confirmed", "nl", baseData);
    expect(result.subject).toBe("Uw reservering is bevestigd");
  });

  test("locale de works", () => {
    const result = renderTemplate("reservation.confirmed", "de", baseData);
    expect(result.subject).toBe("Ihre Reservierung ist bestätigt");
  });

  test("locale it works", () => {
    const result = renderTemplate("reservation.confirmed", "it", baseData);
    expect(result.subject).toBe("La tua prenotazione è confermata");
  });

  test("escapes firstName with XSS attempt", () => {
    const xssData: TemplateData = {
      ...baseData,
      firstName: '<script>alert("xss")</script>',
    };
    const result = renderTemplate("reservation.confirmed", "fr", xssData);
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  test("throws VALIDATION_ERROR for unknown type", () => {
    expect(() => renderTemplate("unknown.type", "fr", baseData)).toThrow();
    try {
      renderTemplate("unknown.type", "fr", baseData);
    } catch (e: any) {
      expect(e.data?.code).toBe("VALIDATION_ERROR");
    }
  });

  test("includes edit and cancel links for confirmed", () => {
    const result = renderTemplate("reservation.confirmed", "fr", baseData);
    expect(result.html).toContain("https://example.com/reservation/abc123");
    expect(result.html).toContain("Modifier ma réservation");
    expect(result.html).toContain("Annuler ma réservation");
  });

  test("does not include edit/cancel links for cancelled", () => {
    const result = renderTemplate("reservation.cancelled", "fr", baseData);
    expect(result.html).not.toContain("Modifier ma réservation");
    expect(result.html).not.toContain("Annuler ma réservation");
  });

  test("all valid types render without error", () => {
    const types = [
      "reservation.confirmed",
      "reservation.pending",
      "reservation.validated",
      "reservation.refused",
      "reservation.cancelled",
      "reservation.reminder",
      "reservation.review",
    ];
    for (const type of types) {
      const result = renderTemplate(type, "en", baseData);
      expect(result.subject).toBeTruthy();
      expect(result.html).toBeTruthy();
    }
  });
});
