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
  const TABLE_GRID_SPAN = 3;

  const tables = [
    ...Array.from({ length: 30 }, (_, i) => ({
      restaurantId,
      name: `S-${String(i + 1).padStart(2, "0")}`,
      zone: "salle" as const,
      capacity: diningCapacities[i % diningCapacities.length],
      positionX: (i % 6) * TABLE_GRID_SPAN,
      positionY: Math.floor(i / 6) * TABLE_GRID_SPAN,
      combinationDirection: "horizontal" as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      restaurantId,
      name: `T-${String(i + 1).padStart(2, "0")}`,
      zone: "terrasse" as const,
      capacity: terraceCapacities[i % terraceCapacities.length],
      positionX: (i % 6) * TABLE_GRID_SPAN,
      positionY: (10 + Math.floor(i / 6)) * TABLE_GRID_SPAN,
      combinationDirection: "horizontal" as const,
      isActive: true,
      createdAt: now,
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
/**
 * Seed weekly templates for La Moulinière.
 * Configuration: Vendredi soir, Samedi midi+soir, Dimanche midi+soir
 * Use this via CLI: npx convex run seed:seedWeeklyTemplates
 */
export const seedWeeklyTemplates = internalMutation({
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
    const restaurantId = restaurant._id;
    const now = Date.now();
    const updatedBy = "seed";

    // Configuration La Moulinière :
    // Midi : Samedi, Dimanche → 12:00, 12:30, 13:00
    // Soir : Vendredi, Samedi, Dimanche → 18:00, 18:30, 19:00
    // Capacité : 8 personnes par créneau
    const lunchSlots = [
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "13:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];

    const dinnerSlots = [
      { timeKey: "18:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "18:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "19:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];

    // La Moulinière schedule:
    // dayOfWeek: 1=Monday, 2=Tuesday, ..., 5=Friday, 6=Saturday, 7=Sunday
    // - Friday (5): dinner only
    // - Saturday (6): lunch + dinner
    // - Sunday (7): lunch + dinner
    // - Mon-Thu (1-4): closed

    const templates = [
      // Monday-Thursday: closed
      { dayOfWeek: 1, service: "lunch" as const, isOpen: false, slots: lunchSlots },
      { dayOfWeek: 1, service: "dinner" as const, isOpen: false, slots: dinnerSlots },
      { dayOfWeek: 2, service: "lunch" as const, isOpen: false, slots: lunchSlots },
      { dayOfWeek: 2, service: "dinner" as const, isOpen: false, slots: dinnerSlots },
      { dayOfWeek: 3, service: "lunch" as const, isOpen: false, slots: lunchSlots },
      { dayOfWeek: 3, service: "dinner" as const, isOpen: false, slots: dinnerSlots },
      { dayOfWeek: 4, service: "lunch" as const, isOpen: false, slots: lunchSlots },
      { dayOfWeek: 4, service: "dinner" as const, isOpen: false, slots: dinnerSlots },
      // Friday: dinner only
      { dayOfWeek: 5, service: "lunch" as const, isOpen: false, slots: lunchSlots },
      { dayOfWeek: 5, service: "dinner" as const, isOpen: true, slots: dinnerSlots },
      // Saturday: lunch + dinner
      { dayOfWeek: 6, service: "lunch" as const, isOpen: true, slots: lunchSlots },
      { dayOfWeek: 6, service: "dinner" as const, isOpen: true, slots: dinnerSlots },
      // Sunday: lunch + dinner
      { dayOfWeek: 7, service: "lunch" as const, isOpen: true, slots: lunchSlots },
      { dayOfWeek: 7, service: "dinner" as const, isOpen: true, slots: dinnerSlots },
    ];

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      // Check if exists
      const existing = await ctx.db
        .query("weeklyTemplates")
        .withIndex("by_restaurant_day_service", (q) =>
          q.eq("restaurantId", restaurantId).eq("dayOfWeek", template.dayOfWeek).eq("service", template.service)
        )
        .unique();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("weeklyTemplates", {
        restaurantId,
        dayOfWeek: template.dayOfWeek,
        service: template.service,
        isOpen: template.isOpen,
        slots: template.slots,
        updatedAt: now,
        updatedBy,
      });
      created++;
    }

    console.log(`✅ Weekly templates seeded: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  },
});

/**
 * Generate slots from weekly templates for the next N days.
 * Use this via CLI: npx convex run seed:generateSlots '{"daysAhead": 60}'
 */
export const generateSlots = internalMutation({
  args: {
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, { daysAhead = 60 }) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw new Error("No active restaurant found");
    }

    const restaurant = activeRestaurants[0];
    const restaurantId = restaurant._id;
    const now = Date.now();

    // Get today
    const today = new Date();
    let created = 0;
    let skipped = 0;

    // For each day in range
    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      // ISO weekday: 1=Monday, 7=Sunday
      const jsDay = date.getDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;

      // For each service
      for (const service of ["lunch", "dinner"] as const) {
        // Get template
        const template = await ctx.db
          .query("weeklyTemplates")
          .withIndex("by_restaurant_day_service", (q) =>
            q.eq("restaurantId", restaurantId).eq("dayOfWeek", dayOfWeek).eq("service", service)
          )
          .unique();

        if (!template || !template.isOpen) {
          continue;
        }

        // For each active slot in template
        for (const templateSlot of template.slots) {
          if (!templateSlot.isActive) {
            continue;
          }

          const slotKey = `${dateKey}#${service}#${templateSlot.timeKey}`;

          // Check if slot already exists
          const existingSlot = await ctx.db
            .query("slots")
            .withIndex("by_restaurant_slotKey", (q) =>
              q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
            )
            .unique();

          if (existingSlot) {
            skipped++;
            continue;
          }

          // Create slot
          await ctx.db.insert("slots", {
            restaurantId,
            dateKey,
            service,
            timeKey: templateSlot.timeKey,
            slotKey,
            isOpen: true,
            capacity: templateSlot.capacity,
            maxGroupSize: templateSlot.maxGroupSize,
            largeTableAllowed: templateSlot.largeTableAllowed,
            updatedAt: now,
          });

          created++;
        }
      }
    }

    console.log(`✅ Slots generated: ${created} created, ${skipped} skipped (${daysAhead} days ahead)`);
    return { created, skipped, daysAhead };
  },
});

// Test reservations for UI testing
const TEST_FIRST_NAMES = ["Marie", "Jean", "Sophie", "Pierre", "Emma", "Lucas", "Camille", "Thomas", "Léa", "Nicolas"];
const TEST_LAST_NAMES = ["Dupont", "Martin", "Bernard", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Garcia", "David"];
const TEST_STATUSES = ["pending", "confirmed", "cardPlaced", "seated", "completed", "noshow", "cancelled"] as const;
const TEST_TIMES_LUNCH = ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15"];
const TEST_TIMES_DINNER = ["19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30"];
const TEST_OPTIONS = ["highChair", "wheelchair", "dogAccess"];
const TEST_LANGUAGES = ["fr", "nl", "en", "de", "it", "es"] as const;
const TEST_PHONE_PREFIXES = ["+32", "+33", "+31", "+49", "+44"];

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: readonly T[], maxCount: number): T[] {
  const count = Math.floor(Math.random() * (maxCount + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const seedTestReservations = internalMutation({
  args: {
    dateKey: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, { dateKey, count = 10 }) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw new Error("No active restaurant found");
    }

    const restaurant = activeRestaurants[0];
    const now = Date.now();
    const created: string[] = [];

    for (let i = 0; i < count; i++) {
      const service = Math.random() > 0.5 ? "lunch" : "dinner";
      const timeKey = service === "lunch" 
        ? randomElement(TEST_TIMES_LUNCH) 
        : randomElement(TEST_TIMES_DINNER);
      const slotKey = `${dateKey}_${service}_${timeKey}`;
      
      const adults = Math.floor(Math.random() * 4) + 1; // 1-4
      const childrenCount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0; // 0-2
      const babyCount = Math.random() > 0.8 ? 1 : 0; // 0-1
      const partySize = adults + childrenCount + babyCount;
      
      const firstName = randomElement(TEST_FIRST_NAMES);
      const lastName = randomElement(TEST_LAST_NAMES);
      const phonePrefix = randomElement(TEST_PHONE_PREFIXES);
      const phoneNumber = `${phonePrefix} ${Math.floor(Math.random() * 900000000) + 100000000}`;
      
      const status = randomElement(TEST_STATUSES);
      const language = randomElement(TEST_LANGUAGES);
      const options = randomSubset(TEST_OPTIONS, 2);
      const hasNote = Math.random() > 0.6;
      const note = hasNote 
        ? randomElement(["Anniversaire", "Allergie gluten", "Table près de la fenêtre SVP", "Client régulier", "Végétarien"])
        : undefined;

      const id = await ctx.db.insert("reservations", {
        restaurantId: restaurant._id,
        dateKey,
        service,
        timeKey,
        slotKey,
        adults,
        childrenCount,
        babyCount,
        partySize,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        phone: phoneNumber,
        language,
        note,
        options,
        status,
        source: "admin",
        tableIds: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
        cancelledAt: status === "cancelled" ? now : null,
        refusedAt: null,
        seatedAt: status === "seated" || status === "completed" ? now : null,
        completedAt: status === "completed" ? now : null,
        noshowAt: status === "noshow" ? now : null,
        markedNoshowAt: null,
      });

      created.push(`${firstName} ${lastName} (${status})`);
    }

    console.log(`✅ Created ${count} test reservations for ${dateKey}`);
    return { created, count };
  },
});

/**
 * Generate 50 varied test reservations across the week.
 * Covers all statuses, services, party sizes, options, languages, etc.
 * Use this via CLI: npx convex run seed:seedWeekReservations
 */
export const seedWeekReservations = internalMutation({
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
    const restaurantId = restaurant._id;
    const now = Date.now();

    // Get tables for assignment
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) => q.eq("restaurantId", restaurantId).eq("isActive", true))
      .collect();

    // Generate dates for the week (today + 6 days)
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }

    // Comprehensive test data
    const firstNames = [
      "Marie", "Jean", "Sophie", "Pierre", "Emma", "Lucas", "Camille", "Thomas", "Léa", "Nicolas",
      "Julie", "Antoine", "Chloé", "Maxime", "Laura", "Alexandre", "Manon", "Julien", "Sarah", "Romain",
      "Pauline", "Mathieu", "Clara", "Vincent", "Anaïs", "Guillaume", "Margot", "Florian", "Océane", "Kevin"
    ];
    const lastNames = [
      "Dupont", "Martin", "Bernard", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Garcia", "David",
      "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Lefebvre", "Mercier", "Dupuis",
      "Lambert", "Bonnet", "François", "Martinez", "Legrand", "Garnier", "Faure", "Rousseau", "Blanc", "Guerin"
    ];

    // Phone prefixes with countries
    const phoneConfigs = [
      { prefix: "+32", lang: "fr" as const },   // Belgium FR
      { prefix: "+32", lang: "nl" as const },   // Belgium NL
      { prefix: "+33", lang: "fr" as const },   // France
      { prefix: "+31", lang: "nl" as const },   // Netherlands
      { prefix: "+49", lang: "de" as const },   // Germany
      { prefix: "+44", lang: "en" as const },   // UK
      { prefix: "+39", lang: "it" as const },   // Italy
      { prefix: "+352", lang: "fr" as const },  // Luxembourg
    ];

    // Time slots
    const lunchTimes = ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30"];
    const dinnerTimes = ["18:00", "18:30", "19:00", "19:15", "19:30", "19:45", "20:00", "20:30"];

    // Notes variées
    const notes = [
      "Anniversaire de mariage",
      "Allergie aux fruits de mer",
      "Allergie gluten - très important",
      "Table près de la fenêtre SVP",
      "Client régulier - VIP",
      "Végétarien strict",
      "Fête d'anniversaire - 30 ans",
      "Repas d'affaires important",
      "Demande menu enfant",
      "Première visite - recommandé par ami",
      "Retour après 2 ans",
      "Chien d'assistance",
      "Poussette double",
      "Personne à mobilité réduite",
      "Demande de gâteau anniversaire",
      null, null, null, null, null, // Plus de chances de ne pas avoir de note
    ];

    // Sources
    const sources = ["online", "admin", "phone", "walkin"] as const;

    // Statuses with realistic distribution
    const statusDistribution = [
      "pending", "pending", "pending",           // 6% pending
      "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", // 20% confirmed
      "seated", "seated", "seated", "seated", "seated",  // 10% seated
      "completed", "completed", "completed", "completed", "completed", "completed", "completed", "completed", "completed", "completed", 
      "completed", "completed", "completed", "completed", "completed", "completed", "completed", "completed", "completed", "completed", // 40% completed
      "noshow", "noshow", "noshow",              // 6% noshow
      "cancelled", "cancelled", "cancelled", "cancelled", "cancelled", // 10% cancelled
      "incident",                                // 2% incident
    ] as const;

    const reservations: Array<{
      dateKey: string;
      service: "lunch" | "dinner";
      timeKey: string;
      adults: number;
      childrenCount: number;
      babyCount: number;
      firstName: string;
      lastName: string;
      phone: string;
      language: "fr" | "nl" | "en" | "de" | "it" | "es";
      status: string;
      source: "online" | "admin" | "phone" | "walkin";
      options: string[];
      note: string | null;
      tableIds: string[];
    }> = [];

    // Generate 50 reservations
    for (let i = 0; i < 50; i++) {
      const dateKey = dates[i % dates.length]; // Distribute across week
      const service = i % 3 === 0 ? "lunch" : "dinner"; // More dinners
      const timeKey = service === "lunch" 
        ? lunchTimes[Math.floor(Math.random() * lunchTimes.length)]
        : dinnerTimes[Math.floor(Math.random() * dinnerTimes.length)];

      // Party composition - varied scenarios
      let adults: number, childrenCount: number, babyCount: number;
      const scenario = i % 10;
      switch (scenario) {
        case 0: // Couple
          adults = 2; childrenCount = 0; babyCount = 0;
          break;
        case 1: // Solo
          adults = 1; childrenCount = 0; babyCount = 0;
          break;
        case 2: // Family with kids
          adults = 2; childrenCount = 2; babyCount = 0;
          break;
        case 3: // Family with baby
          adults = 2; childrenCount = 0; babyCount = 1;
          break;
        case 4: // Large group
          adults = 6; childrenCount = 0; babyCount = 0;
          break;
        case 5: // Family reunion
          adults = 4; childrenCount = 3; babyCount = 1;
          break;
        case 6: // Business dinner
          adults = 4; childrenCount = 0; babyCount = 0;
          break;
        case 7: // Couple with baby
          adults = 2; childrenCount = 0; babyCount = 1;
          break;
        case 8: // Friends group
          adults = 5; childrenCount = 0; babyCount = 0;
          break;
        default: // Random
          adults = Math.floor(Math.random() * 4) + 1;
          childrenCount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
          babyCount = Math.random() > 0.85 ? 1 : 0;
      }

      const phoneConfig = phoneConfigs[Math.floor(Math.random() * phoneConfigs.length)];
      const phoneNumber = `${phoneConfig.prefix} ${Math.floor(Math.random() * 900000000) + 100000000}`;

      const status = statusDistribution[Math.floor(Math.random() * statusDistribution.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];

      // Options based on party composition
      const options: string[] = [];
      if (babyCount > 0 || childrenCount > 0) {
        if (Math.random() > 0.3) options.push("highChair");
      }
      if (Math.random() > 0.92) options.push("wheelchair");
      if (Math.random() > 0.88) options.push("dogAccess");

      // Assign tables for seated/completed reservations
      const tableIds: string[] = [];
      if ((status === "seated" || status === "completed" || status === "incident") && tables.length > 0) {
        const partySize = adults + childrenCount + babyCount;
        // Find suitable table(s)
        const suitableTables = tables.filter(t => t.capacity >= Math.min(partySize, 4));
        if (suitableTables.length > 0) {
          const table = suitableTables[Math.floor(Math.random() * suitableTables.length)];
          tableIds.push(table._id);
        }
      }

      reservations.push({
        dateKey,
        service,
        timeKey,
        adults,
        childrenCount,
        babyCount,
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        phone: phoneNumber,
        language: phoneConfig.lang,
        status,
        source,
        options,
        note: notes[Math.floor(Math.random() * notes.length)],
        tableIds,
      });
    }

    // Insert all reservations
    let created = 0;
    for (const r of reservations) {
      const partySize = r.adults + r.childrenCount + r.babyCount;
      const slotKey = `${r.dateKey}#${r.service}#${r.timeKey}`;

      await ctx.db.insert("reservations", {
        restaurantId,
        dateKey: r.dateKey,
        service: r.service,
        timeKey: r.timeKey,
        slotKey,
        adults: r.adults,
        childrenCount: r.childrenCount,
        babyCount: r.babyCount,
        partySize,
        firstName: r.firstName,
        lastName: r.lastName,
        email: `${r.firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${r.lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@test.com`,
        phone: r.phone,
        language: r.language,
        note: r.note ?? undefined,
        options: r.options,
        status: r.status as "pending" | "confirmed" | "cardPlaced" | "seated" | "completed" | "noshow" | "cancelled" | "refused" | "incident",
        source: r.source,
        tableIds: r.tableIds as any,
        version: 1,
        createdAt: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Random creation time in last week
        updatedAt: now,
        cancelledAt: r.status === "cancelled" ? now - Math.floor(Math.random() * 24 * 60 * 60 * 1000) : null,
        refusedAt: null,
        seatedAt: (r.status === "seated" || r.status === "completed" || r.status === "incident") ? now - Math.floor(Math.random() * 4 * 60 * 60 * 1000) : null,
        completedAt: r.status === "completed" ? now - Math.floor(Math.random() * 2 * 60 * 60 * 1000) : null,
        noshowAt: r.status === "noshow" ? now - Math.floor(Math.random() * 24 * 60 * 60 * 1000) : null,
        markedNoshowAt: null,
      });
      created++;
    }

    // Summary by status
    const statusCounts: Record<string, number> = {};
    for (const r of reservations) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    console.log(`✅ Created ${created} test reservations across ${dates.length} days`);
    console.log("Status distribution:", statusCounts);

    return { 
      created, 
      dates,
      statusCounts,
    };
  },
});

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

