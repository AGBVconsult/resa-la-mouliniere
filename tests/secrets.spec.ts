import { describe, expect, test } from "vitest";
import { resolveSecrets } from "../convex/lib/secrets";

const dbSettings = {
  appUrl: "https://db.example/",
  turnstileSecretKey: "db-turnstile",
  resendApiKey: "db-resend",
  pushoverUserKey: "db-pushover-user",
  pushoverApiToken: "db-pushover-token",
};

describe("resolveSecrets", () => {
  test("les variables d'environnement priment sur la base", () => {
    const r = resolveSecrets(dbSettings, {
      TURNSTILE_SECRET_KEY: "env-turnstile",
      RESEND_API_KEY: "env-resend",
      PUSHOVER_USER_KEY: "env-pu",
      PUSHOVER_API_TOKEN: "env-pt",
      APP_URL: "https://env.example",
    });
    expect(r.turnstileSecretKey).toBe("env-turnstile");
    expect(r.resendApiKey).toBe("env-resend");
    expect(r.pushoverUserKey).toBe("env-pu");
    expect(r.pushoverApiToken).toBe("env-pt");
    expect(r.appUrl).toBe("https://env.example");
    expect(r.fromDatabase).toEqual([]);
  });

  test("repli sur la base quand l'environnement est vide, avec diagnostic", () => {
    const r = resolveSecrets(dbSettings, {});
    expect(r.turnstileSecretKey).toBe("db-turnstile");
    expect(r.resendApiKey).toBe("db-resend");
    expect(r.appUrl).toBe("https://db.example");
    expect(r.fromDatabase).toEqual([
      "turnstileSecretKey",
      "resendApiKey",
      "pushoverUserKey",
      "pushoverApiToken",
      "appUrl",
    ]);
  });

  test("une variable vide ou blanche ne masque pas la base", () => {
    const r = resolveSecrets(dbSettings, { RESEND_API_KEY: "   ", TURNSTILE_SECRET_KEY: "" });
    expect(r.resendApiKey).toBe("db-resend");
    expect(r.turnstileSecretKey).toBe("db-turnstile");
  });

  test("absence totale → chaînes vides / undefined, jamais d'exception", () => {
    const r = resolveSecrets({ turnstileSecretKey: "" }, {});
    expect(r.turnstileSecretKey).toBe("");
    expect(r.resendApiKey).toBeUndefined();
    expect(r.appUrl).toBe("");
    expect(r.fromDatabase).toEqual([]);
  });

  test("le slash final de APP_URL est retiré", () => {
    expect(resolveSecrets({ turnstileSecretKey: "x" }, { APP_URL: "https://a.b///" }).appUrl).toBe("https://a.b");
  });
});
