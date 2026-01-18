/**
 * Global Settings management (PRD-012).
 * Singleton pattern with auto-healing and audit history.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { DEFAULT_SETTINGS } from "./lib/defaultSettings";
import { settingsSchema, settingsUpdateSchema } from "./lib/validations";
import { requireRole } from "./lib/rbac";

// ============================================================================
// RBAC Helpers
// ============================================================================

type UserRole = "owner" | "admin" | "staff";

interface AuthenticatedUser {
  name: string;
  email: string;
  clerkUserId: string;
  role: UserRole;
}

async function getAuthenticatedUser(ctx: any): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // For now, return basic info from identity
  // In production, this would query the users table
  return {
    name: identity.name ?? identity.email ?? "Unknown",
    email: identity.email ?? "",
    clerkUserId: identity.subject,
    role: "admin" as UserRole, // Default to admin for now
  };
}

function canReadSettings(role: UserRole): boolean {
  return ["owner", "admin", "staff"].includes(role);
}

function canWriteSettings(role: UserRole): boolean {
  return ["owner", "admin"].includes(role);
}

function canReadHistory(role: UserRole): boolean {
  return ["owner", "admin"].includes(role);
}

// ============================================================================
// Singleton Safe (Auto-healing)
// ============================================================================

async function getSettingsSafe(ctx: any) {
  const docs = await ctx.db
    .query("globalSettings")
    .withIndex("by_key", (q: any) => q.eq("key", "global"))
    .collect();

  if (docs.length === 0) {
    return null;
  }

  if (docs.length === 1) {
    return docs[0];
  }

  // Multi-doc detected: keep most recent, delete others
  console.warn(`[SETTINGS] Multi-doc detected (${docs.length}). Auto-healing...`);
  
  const sorted = docs.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  const keep = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    await ctx.db.delete(sorted[i]._id);
    console.warn(`[SETTINGS] Document deleted: ${sorted[i]._id}`);
  }

  return keep;
}

// ============================================================================
// Public Settings Whitelist
// ============================================================================

const PUBLIC_SETTINGS_KEYS = [
  "restaurantName",
  "address",
  "phone",
  "email",
  "timezone",
  "widgetLanguages",
  "widgetDefaultLanguage",
  "minBookingDelayMinutes",
  "maxBookingAdvanceMonths",
  "contactUsThreshold",
  "defaultReservationDurationMinutes",
  "largeGroupThreshold",
] as const;

function filterPublicSettings(settings: typeof DEFAULT_SETTINGS) {
  const result: Record<string, any> = {};
  for (const key of PUBLIC_SETTINGS_KEYS) {
    result[key] = key === "phone" ? (settings[key] ?? "") : settings[key];
  }
  return result;
}

// ============================================================================
// Public Queries
// ============================================================================

export const getPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettingsSafe(ctx);
    return filterPublicSettings(settings ?? DEFAULT_SETTINGS);
  },
});

// ============================================================================
// Private Queries
// ============================================================================

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const settings = await getSettingsSafe(ctx);
    return settings ?? { ...DEFAULT_SETTINGS, _id: null };
  },
});

export const getValue = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await requireRole(ctx, "admin");

    const settings = await getSettingsSafe(ctx);
    const data = settings ?? DEFAULT_SETTINGS;
    return (data as any)[key];
  },
});

export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    await requireRole(ctx, "admin");

    return await ctx.db
      .query("settingsHistory")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

// ============================================================================
// Internal Mutations
// ============================================================================

export const _initialize = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await getSettingsSafe(ctx);
    if (existing) {
      return existing._id;
    }

    const now = Date.now();

    return await ctx.db.insert("globalSettings", {
      ...DEFAULT_SETTINGS,
      updatedAt: now,
      updatedBy: "system",
    });
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const update = mutation({
  args: {
    updates: v.any(),
  },
  handler: async (ctx, { updates }) => {
    await requireRole(ctx, "admin");

    const user = await getAuthenticatedUser(ctx);
    const userName = user?.name ?? "Unknown";
    const userId = user?.clerkUserId;
    const userRole = user?.role ?? "admin";

    let settings = await getSettingsSafe(ctx);

    if (!settings) {
      const id = await ctx.db.insert("globalSettings", {
        ...DEFAULT_SETTINGS,
        updatedAt: Date.now(),
        updatedBy: userName,
        updatedByUserId: userId,
      });
      settings = await ctx.db.get(id);
    }

    // 1. Validate updates with strict schema (rejects unknown keys)
    const parsedUpdatesResult = settingsUpdateSchema.strict().safeParse(updates);
    if (!parsedUpdatesResult.success) {
      const err = parsedUpdatesResult.error.issues[0];
      throw new Error(`Clé invalide : ${err.path.join(".")} - ${err.message}`);
    }
    const parsedUpdates = parsedUpdatesResult.data;

    // 2. Merge with current settings
    const merged = { ...settings, ...parsedUpdates };

    // 3. Validate final state (cross-field)
    const finalResult = settingsSchema.safeParse(merged);
    if (!finalResult.success) {
      const err = finalResult.error.issues[0];
      throw new Error(`Validation : ${err.path.join(".")} - ${err.message}`);
    }

    // 4. Calculate changes
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const [key, newValue] of Object.entries(parsedUpdates)) {
      const oldValue = (settings as any)[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue });
      }
    }

    // 5. Save history
    if (changes.length > 0) {
      await ctx.db.insert("settingsHistory", {
        settingsId: settings._id,
        changes,
        modifiedBy: userName,
        modifiedByUserId: userId,
        modifiedByRole: userRole,
        modifiedAt: Date.now(),
      });
    }

    // 6. Patch only parsed keys
    await ctx.db.patch(settings._id, {
      ...parsedUpdates,
      updatedAt: Date.now(),
      updatedBy: userName,
      updatedByUserId: userId,
    });

    return { success: true, changesCount: changes.length };
  },
});

export const resetToDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const user = await getAuthenticatedUser(ctx);
    const userName = user?.name ?? "Unknown";
    const userId = user?.clerkUserId;
    const userRole = user?.role ?? "admin";

    const settings = await getSettingsSafe(ctx);

    if (!settings) {
      return await ctx.db.insert("globalSettings", {
        ...DEFAULT_SETTINGS,
        updatedAt: Date.now(),
        updatedBy: userName,
        updatedByUserId: userId,
      });
    }

    const changes = Object.entries(DEFAULT_SETTINGS)
      .filter(([key]) => key !== "key")
      .map(([key, newValue]) => ({
        field: key,
        oldValue: (settings as any)[key],
        newValue,
      }))
      .filter((c) => JSON.stringify(c.oldValue) !== JSON.stringify(c.newValue));

    if (changes.length > 0) {
      await ctx.db.insert("settingsHistory", {
        settingsId: settings._id,
        changes,
        modifiedBy: `${userName} (reset)`,
        modifiedByUserId: userId,
        modifiedByRole: userRole,
        modifiedAt: Date.now(),
      });
    }

    await ctx.db.patch(settings._id, {
      ...DEFAULT_SETTINGS,
      updatedAt: Date.now(),
      updatedBy: userName,
      updatedByUserId: userId,
    });

    return { success: true, resetCount: changes.length };
  },
});
