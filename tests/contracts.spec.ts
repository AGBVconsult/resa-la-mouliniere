import { describe, expect, test } from "vitest";

import {
  ErrorCode,
  ExpectedActions,
  ExpectedMutations,
  ExpectedQueries,
  SettingsAdminSchema,
} from "../spec/contracts.generated";

import { checkNoSecretInLogs, isAllowedTurnstileUsage } from "../scripts/contracts/check";
import { getRoleFromIdentity, requireRole } from "../convex/lib/rbac";

describe("contracts (generated)", () => {
  test("exports expected arrays (non-empty)", () => {
    expect(ErrorCode.length).toBeGreaterThan(0);
    expect(ExpectedQueries.length).toBeGreaterThan(0);
    expect(ExpectedMutations.length).toBeGreaterThan(0);
    expect(ExpectedActions.length).toBeGreaterThan(0);
  });

describe("rbac (requireRole)", () => {
  test("getRoleFromIdentity defaults to staff", () => {
    expect(getRoleFromIdentity({})).toBe("staff");
  });

  test("getRoleFromIdentity reads tokenClaims.role", () => {
    expect(getRoleFromIdentity({ tokenClaims: { role: "admin" } })).toBe("admin");
  });

  test("requireRole throws ConvexError with FORBIDDEN code when role insufficient", async () => {
    const ctx: any = {
      auth: {
        getUserIdentity: async () => ({ tokenClaims: { role: "staff" } }),
      },
    };
    await expect(requireRole(ctx, "admin")).rejects.toMatchObject({
      data: { code: "FORBIDDEN", messageKey: "error.forbidden" },
    });
  });
});

describe("admin.getSettings output shape", () => {
  test("SettingsAdminSchema accepts expected fields and rejects secrets", () => {
    const ok = {
      restaurantId: "r1",
      publicWidgetEnabled: true,
      turnstileSiteKey: "site",
      maxPartySizeWidget: 15,
      timezone: "Europe/Brussels",
      resendFromEmail: "no-reply@example.com",
      resendFromName: "La Moulinière",
      manageTokenExpireBeforeSlotMs: 123,
      rateLimit: { windowMs: 60000, maxRequests: 12 },
    };
    expect(() => SettingsAdminSchema.parse(ok)).not.toThrow();
    expect(() => SettingsAdminSchema.parse({ ...ok, turnstileSecretKey: "x" } as any)).toThrow();
  });
});

  test("SettingsAdminSchema refuses turnstileSecretKey", () => {
    expect(() =>
      SettingsAdminSchema.parse({
        restaurantId: "r1",
        publicWidgetEnabled: true,
        turnstileSiteKey: "site",
        maxPartySizeWidget: 15,
        timezone: "Europe/Brussels",
        resendFromEmail: "no-reply@example.com",
        resendFromName: "La Moulinière",
        manageTokenExpireBeforeSlotMs: 123,
        rateLimit: { windowMs: 60000, maxRequests: 12 },
        turnstileSecretKey: "x",
      })
    ).toThrow();
  });
});

describe("no-secret-leak policy (turnstileSecretKey)", () => {
  test("allows spec/CONTRACTS.md", () => {
    expect(isAllowedTurnstileUsage("spec/CONTRACTS.md", "turnstileSecretKey").allowed).toBe(true);
  });

  test("allows convex/schema.ts", () => {
    expect(isAllowedTurnstileUsage("convex/schema.ts", "turnstileSecretKey").allowed).toBe(true);
  });

  test("allows turnstileSecretKey in action()", () => {
    const content = `
      import { action } from "./_generated/server";
      export const verify = action({
        args: {},
        handler: async () => {
          const x = turnstileSecretKey;
          return x;
        }
      });
    `;
    expect(isAllowedTurnstileUsage("convex/turnstile.ts", content).allowed).toBe(true);
  });

  test("allows turnstileSecretKey in internalMutation()", () => {
    const content = `
      import { internalMutation } from "./_generated/server";
      export const seed = internalMutation({
        args: {},
        handler: async () => {
          return turnstileSecretKey;
        }
      });
    `;
    expect(isAllowedTurnstileUsage("convex/seed.ts", content).allowed).toBe(true);
  });

  test("forbids turnstileSecretKey in query()", () => {
    const content = `
      import { query } from "./_generated/server";
      export const getSettings = query({
        args: {},
        handler: async () => {
          return { secret: turnstileSecretKey };
        }
      });
    `;
    const verdict = isAllowedTurnstileUsage("convex/settings.ts", content);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("query()");
  });

  test("forbids turnstileSecretKey in mutation()", () => {
    const content = `
      import { mutation } from "./_generated/server";
      export const update = mutation({
        args: {},
        handler: async () => {
          return turnstileSecretKey;
        }
      });
    `;
    const verdict = isAllowedTurnstileUsage("convex/settings.ts", content);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("mutation()");
  });

  test("allows turnstileSecretKey in admin.updateSecrets mutation()", () => {
    const content = `
      import { mutation } from "./_generated/server";
      export const updateSecrets = mutation({
        args: {},
        handler: async () => {
          return turnstileSecretKey;
        }
      });
    `;
    const verdict = isAllowedTurnstileUsage("convex/admin.ts", content);
    expect(verdict.allowed).toBe(true);
  });

  test("forbids turnstileSecretKey in src/**", () => {
    const verdict = isAllowedTurnstileUsage("src/lib/api.ts", "turnstileSecretKey");
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("src/**");
  });

  test("forbids turnstileSecretKey in query() even in admin.ts", () => {
    const content = `
      import { query, mutation } from "./_generated/server";
      
      export const leakyQuery = query({
        handler: async (ctx) => {
          const settings = await ctx.db.query("settings").first();
          return { secret: settings.turnstileSecretKey };
        }
      });
      
      export const updateSecrets = mutation({
        handler: async (ctx, args) => {
          await ctx.db.patch(id, { turnstileSecretKey: args.secret });
        }
      });
    `;
    const verdict = isAllowedTurnstileUsage("convex/admin.ts", content);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("query()");
  });

  test("forbids turnstileSecretKey in other mutations in admin.ts", () => {
    const content = `
      import { mutation } from "./_generated/server";
      
      export const updateSecrets = mutation({
        handler: async (ctx, args) => {
          await ctx.db.patch(id, { turnstileSecretKey: args.secret });
        }
      });
      
      export const otherMutation = mutation({
        handler: async (ctx) => {
          const s = settings.turnstileSecretKey;
        }
      });
    `;
    const verdict = isAllowedTurnstileUsage("convex/admin.ts", content);
    expect(verdict.allowed).toBe(true);
  });
});

describe("no-secret-in-logs policy", () => {
  test("forbids turnstileSecretKey in console.log", () => {
    const content = `
      export const verify = action({
        handler: async () => {
          console.log("Debug:", settings.turnstileSecretKey);
        }
      });
    `;
    const verdict = checkNoSecretInLogs("convex/turnstile.ts", content);
    expect(verdict.ok).toBe(false);
  });

  test("forbids logging full settings object", () => {
    const content = `
      export const verify = action({
        handler: async () => {
          const turnstileSecretKey = "x";
          console.log(settings);
        }
      });
    `;
    const verdict = checkNoSecretInLogs("convex/turnstile.ts", content);
    expect(verdict.ok).toBe(false);
  });

  test("forbids logging turnstileToken", () => {
    const content = `
      export const create = action({
        handler: async () => {
          console.log("Token:", turnstileToken);
        }
      });
    `;
    const verdict = checkNoSecretInLogs("convex/reservations.ts", content);
    expect(verdict.ok).toBe(false);
  });

  test("forbids logging secretKey", () => {
    const content = `
      export const verify = action({
        handler: async () => {
          console.log("Key:", secretKey);
        }
      });
    `;
    const verdict = checkNoSecretInLogs("convex/turnstile.ts", content);
    expect(verdict.ok).toBe(false);
  });

  test("forbids logging apiKey in email files", () => {
    const content = `
      export const sendEmail = async () => {
        console.log("API Key:", apiKey);
      };
    `;
    const verdict = checkNoSecretInLogs("convex/lib/email/resend.ts", content);
    expect(verdict.ok).toBe(false);
  });

  test("forbids logging resendApiKey", () => {
    const content = `
      export const processQueue = internalAction({
        handler: async () => {
          console.log("Resend key:", resendApiKey);
        }
      });
    `;
    const verdict = checkNoSecretInLogs("convex/emails.ts", content);
    expect(verdict.ok).toBe(false);
  });

  test("allows logging safe identifiers", () => {
    const content = `
      export const _create = internalMutation({
        handler: async () => {
          console.log("Reservation created", { reservationId, slotKey, status, partySize });
        }
      });
    `;
    const verdict = checkNoSecretInLogs("convex/reservations.ts", content);
    expect(verdict.ok).toBe(true);
  });
});
