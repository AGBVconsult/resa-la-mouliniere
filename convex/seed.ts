import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

type SeedRestaurantResult = { skipped: boolean; id: Id<"restaurants">; name: string };
type SeedSettingsResult = { skipped: boolean; id: Id<"settings"> };
type SeedTablesResult = { skipped: boolean; count: number };

async function seedRestaurantImpl(ctx: MutationCtx): Promise<SeedRestaurantResult> {
  const activeRestaurants = await ctx.db
    .query("restaurants")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .take(2);

  if (activeRestaurants.length > 1) {
    throw new Error(`CONTRACT_VIOLATION: Expected exactly 1 active restaurant, found ${activeRestaurants.length}`);
  }

  const existing = activeRestaurants[0] ?? null;
  if (existing) {
    console.log("⏭️  Restaurant already exists, skipping");
    return { skipped: true, id: existing._id, name: existing.name };
  }

  const name = "La Moulinière";

  let id: Id<"restaurants">;
  try {
    id = await ctx.db.insert("restaurants", {
      name,
      timezone: "Europe/Brussels",
      isActive: true,
    });
  } catch (error) {
    const inserted = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (inserted) {
      console.log("⏭️  Restaurant inserted by concurrent seed, skipping");
      return { skipped: true, id: inserted._id, name: inserted.name };
    }
    throw error;
  }

  const activeAfter = await ctx.db
    .query("restaurants")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .take(2);
  if (activeAfter.length > 1) {
    throw new Error(`CONTRACT_VIOLATION: Expected exactly 1 active restaurant, found ${activeAfter.length}`);
  }

  console.log("✅ Restaurant seeded:", id);
  return { skipped: false, id, name };
}

async function seedSettingsImpl(ctx: MutationCtx, restaurantId: Id<"restaurants">, restaurantName: string): Promise<SeedSettingsResult> {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
    .unique();

  if (existing) {
    console.log("⏭️  Settings already exists, skipping");
    return { skipped: true, id: existing._id };
  }

  // Defaults from spec/CONTRACTS.md
  // NON-SPÉCIFIÉ: turnstileSiteKey default value is not defined in the contract.
  // NON-SPÉCIFIÉ: resendFromEmail default depends on domain and is not specified in the contract.
  let id: Id<"settings">;
  try {
    id = await ctx.db.insert("settings", {
      restaurantId,
      publicWidgetEnabled: true,
      appUrl: "https://lamouliniere.be", // Base URL for email links
      turnstileSiteKey: "REPLACE_IN_CONVEX_DASHBOARD",
      turnstileSecretKey: "REPLACE_IN_CONVEX_DASHBOARD",
      resendApiKey: "REPLACE_IN_CONVEX_DASHBOARD",
      resendFromEmail: "no-reply@REPLACE_DOMAIN",
      resendFromName: restaurantName,
      maxPartySizeWidget: 15,
      manageTokenExpireBeforeSlotMs: 2 * 60 * 60 * 1000,
      rateLimit: { windowMs: 60_000, maxRequests: 12 },
    });
  } catch (error) {
    const inserted = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .unique();
    if (inserted) {
      console.log("⏭️  Settings inserted by concurrent seed, skipping");
      return { skipped: true, id: inserted._id };
    }
    throw error;
  }

  console.log("✅ Settings seeded:", id);
  return { skipped: false, id };
}

async function seedTablesImpl(ctx: MutationCtx, restaurantId: Id<"restaurants">): Promise<SeedTablesResult> {
  const anyActive = await ctx.db
    .query("tables")
    .withIndex("by_restaurant_isActive", (q) => q.eq("restaurantId", restaurantId).eq("isActive", true))
    .take(1);
  const anyInactive = await ctx.db
    .query("tables")
    .withIndex("by_restaurant_isActive", (q) => q.eq("restaurantId", restaurantId).eq("isActive", false))
    .take(1);

  if (anyActive.length > 0 || anyInactive.length > 0) {
    const activeCount = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) => q.eq("restaurantId", restaurantId).eq("isActive", true))
      .collect()
      .then((t) => t.length);
    const inactiveCount = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) => q.eq("restaurantId", restaurantId).eq("isActive", false))
      .collect()
      .then((t) => t.length);
    const count = activeCount + inactiveCount;
    console.log(`⏭️  Tables already exist (${count}), skipping`);
    return { skipped: true, count };
  }

  const now = Date.now();

  // NON-SPÉCIFIÉ: PRD-004 §8.1 is outside spec/CONTRACTS.md. We seed 50 physical tables using only contract fields.

  const diningCapacities = [2, 2, 4, 4, 4, 6, 6, 8];
  const terraceCapacities = [2, 4, 4, 6];

  const tables = [
    ...Array.from({ length: 30 }, (_, i) => ({
      restaurantId,
      name: `D-${String(i + 1).padStart(2, "0")}`,
      zone: "dining" as const,
      capacity: diningCapacities[i % diningCapacities.length],
      gridX: i % 6,
      gridY: Math.floor(i / 6),
      isActive: true,
      updatedAt: now,
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      restaurantId,
      name: `T-${String(i + 1).padStart(2, "0")}`,
      zone: "terrace" as const,
      capacity: terraceCapacities[i % terraceCapacities.length],
      gridX: i % 6,
      gridY: 100 + Math.floor(i / 6),
      isActive: true,
      updatedAt: now,
    })),
  ];

  try {
    for (const table of tables) {
      await ctx.db.insert("tables", table);
    }
  } catch (error) {
    const count = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) => q.eq("restaurantId", restaurantId).eq("isActive", true))
      .collect()
      .then((t) => t.length);
    if (count > 0) {
      console.log(`⏭️  Tables inserted by concurrent seed (${count}), skipping`);
      return { skipped: true, count };
    }
    throw error;
  }

  console.log(`✅ Tables seeded: ${tables.length}`);
  return { skipped: false, count: tables.length };
}

export const seedSettings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurant = await seedRestaurantImpl(ctx);
    return await seedSettingsImpl(ctx, restaurant.id, restaurant.name);
  },
});

export const seedTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurant = await seedRestaurantImpl(ctx);
    return await seedTablesImpl(ctx, restaurant.id);
  },
});

export const seedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurant = await seedRestaurantImpl(ctx);
    const settings = await seedSettingsImpl(ctx, restaurant.id, restaurant.name);
    const tables = await seedTablesImpl(ctx, restaurant.id);

    return { restaurant, settings, tables };
  },
});

/**
 * Migrate settings to add resendApiKey field.
 * Run this once after schema update.
 */
export const migrateAddResendApiKey = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allSettings = await ctx.db.query("settings").collect();
    let migrated = 0;

    for (const settings of allSettings) {
      // Check if resendApiKey is missing (using any to bypass type check during migration)
      const doc = settings as Record<string, unknown>;
      if (!doc.resendApiKey) {
        await ctx.db.patch(settings._id, {
          resendApiKey: "REPLACE_IN_CONVEX_DASHBOARD",
        });
        migrated++;
      }
    }

    console.log(`✅ Migrated ${migrated} settings documents`);
    return { migrated };
  },
});

/**
 * Set Resend API key directly.
 * Use this via CLI: npx convex run seed:setResendApiKey '{"apiKey":"re_..."}'
 */
export const setResendApiKey = internalMutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, { apiKey }) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw new Error("No active restaurant found");
    }

    const restaurant = activeRestaurants[0];

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw new Error("Settings not found");
    }

    await ctx.db.patch(settings._id, {
      resendApiKey: apiKey,
    });

    console.log("✅ Resend API key configured");
    return { ok: true };
  },
});

/**
 * Update secrets for staging/testing (internal only, no auth required).
 * Use this via CLI: npx convex run seed:updateSecrets --args '{...}'
 */
export const updateSecrets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw new Error("No active restaurant found");
    }

    const restaurant = activeRestaurants[0];

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw new Error("Settings not found");
    }

    // Update with staging test values
    // NOTE: These are placeholder values - replace with real staging keys
    // IMPORTANT: Set RESEND_API_KEY env var in Convex Dashboard for real emails
    await ctx.db.patch(settings._id, {
      appUrl: process.env.APP_URL ?? "https://lamouliniere.be",
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA", // Cloudflare test key (always passes)
      turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "1x0000000000000000000000000000000AA", // Cloudflare test key
      resendApiKey: process.env.RESEND_API_KEY ?? "re_REPLACE_WITH_REAL_KEY",
      resendFromEmail: "no-reply@lamouliniere.be",
      resendFromName: "La Moulinière",
    });

    console.log("✅ Secrets updated for staging");

    return { ok: true, restaurantId: restaurant._id };
  },
});

/**
 * Enqueue a test email (internal only, for testing).
 * Use this via CLI: npx convex run seed:testEmail --args '{"to":"test@example.com"}'
 */
export const testEmail = internalMutation({
  args: {
    to: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { to, type = "reservation.confirmed" }) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw new Error("No active restaurant found");
    }

    const restaurant = activeRestaurants[0];
    const now = Date.now();
    const dedupeKey = `test-manual-${now}`;

    const jobId = await ctx.db.insert("emailJobs", {
      restaurantId: restaurant._id,
      type: type as "reservation.confirmed",
      to,
      subjectKey: `email.${type}.subject`,
      templateKey: type,
      templateData: {
        firstName: "Test",
        lastName: "User",
        dateKey: "2024-12-25",
        timeKey: "19:00",
        service: "dinner",
        partySize: 4,
        language: "fr",
        manageUrl: "https://example.com/manage/test-token",
      },
      icsBase64: null,
      status: "queued",
      attemptCount: 0,
      nextRetryAt: null,
      lastAttemptAt: null,
      lastErrorCode: null,
      dedupeKey,
      createdAt: now,
      updatedAt: now,
    });

    console.log("✅ Test email enqueued", { jobId, to, type, dedupeKey });

    return { jobId, dedupeKey };
  },
});

