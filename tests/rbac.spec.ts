// @vitest-environment edge-runtime
/**
 * Contrôle d'accès des fonctions Convex, exécuté contre le vrai backend (convex-test).
 *
 * Invariants :
 * - une fonction admin appelée sans identité lève FORBIDDEN (code contractuel) ;
 * - un rôle insuffisant lève FORBIDDEN ;
 * - une identité `owner` passe ;
 * - les fonctions publiques du widget restent accessibles sans identité.
 */
import { describe, expect, test, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

// Inclut _generated/*.js (requis par convex-test) et exclut les déclarations de types.
const modules = import.meta.glob([
  "../convex/**/*.*s",
  "!../convex/**/*.d.ts",
  "!../convex/auth.config.ts",
]);

const OWNER = { subject: "owner@example.test", issuer: "https://issuer.test", role: "owner" };
const STAFF = { subject: "staff@example.test", issuer: "https://issuer.test", role: "staff" };

async function seedRestaurant(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const restaurantId = await ctx.db.insert("restaurants", {
      name: "Test",
      timezone: "Europe/Brussels",
      isActive: true,
    });
    await ctx.db.insert("settings", {
      restaurantId,
      publicWidgetEnabled: true,
      turnstileSiteKey: "1x00000000000000000000AA",
      turnstileSecretKey: "placeholder",
      resendFromEmail: "no-reply@example.test",
      resendFromName: "Test",
      maxPartySizeWidget: 15,
      manageTokenExpireBeforeSlotMs: 0,
      rateLimit: { windowMs: 60000, maxRequests: 10 },
    });
  });
}

describe("rbac — fonctions Convex", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    delete process.env.CONVEX_AUTH_ENFORCEMENT;
    t = convexTest(schema, modules);
    await seedRestaurant(t);
  });

  test("admin.getSettings sans identité → FORBIDDEN", async () => {
    await expect(t.query(api.admin.getSettings, {})).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });

  test("admin.getSettings avec rôle staff → FORBIDDEN", async () => {
    await expect(t.withIdentity(STAFF).query(api.admin.getSettings, {})).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });

  test("admin.getSettings avec rôle owner → OK", async () => {
    const settings = await t.withIdentity(OWNER).query(api.admin.getSettings, {});
    expect(settings.publicWidgetEnabled).toBe(true);
    expect(settings).not.toHaveProperty("turnstileSecretKey");
  });

  test("mutations admin sans identité → FORBIDDEN (échantillon)", async () => {
    await expect(
      t.mutation(api.admin.updateFunnelAnalytics, { enabled: true })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(
      t.query(api.clients.list, { paginationOpts: { numItems: 10, cursor: null } })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(
      t.query(api.floorplan.getTableStates, { dateKey: "2026-09-04", service: "lunch" })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(t.query(api.bookingDrafts.list, {})).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });

  test("fonctions publiques du widget accessibles sans identité", async () => {
    const settings = await t.query(api.widget.getSettings, { lang: "fr" });
    expect(settings.publicWidgetEnabled).toBe(true);

    const day = await t.query(api.availability.getDay, { dateKey: "2026-09-04", partySize: 2 });
    expect(day.dateKey).toBe("2026-09-04");

    const closure = await t.query(api.specialPeriods.getActiveClosure, {});
    expect(closure).toBeDefined();
  });

  test("coupe-circuit CONVEX_AUTH_ENFORCEMENT=off ouvre les fonctions admin", async () => {
    process.env.CONVEX_AUTH_ENFORCEMENT = "off";
    try {
      const settings = await t.query(api.admin.getSettings, {});
      expect(settings.publicWidgetEnabled).toBe(true);
    } finally {
      delete process.env.CONVEX_AUTH_ENFORCEMENT;
    }
  });
});
