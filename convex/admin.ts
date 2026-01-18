import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";
import { isValidStatusTransition } from "./lib/stateMachine";
import type { ReservationStatus } from "../spec/contracts.generated";

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    // SettingsAdmin = SettingsPublic + { resendFromEmail, resendFromName, manageTokenExpireBeforeSlotMs, rateLimit, progressiveFilling }
    // MUST NOT return turnstileSecretKey (secrets handled via admin.updateSecrets).
    return {
      restaurantId: restaurant._id,
      publicWidgetEnabled: settings.publicWidgetEnabled,
      turnstileSiteKey: settings.turnstileSiteKey,
      maxPartySizeWidget: settings.maxPartySizeWidget,
      timezone: restaurant.timezone,
      resendFromEmail: settings.resendFromEmail,
      resendFromName: settings.resendFromName,
      manageTokenExpireBeforeSlotMs: settings.manageTokenExpireBeforeSlotMs,
      rateLimit: settings.rateLimit,
      progressiveFilling: settings.progressiveFilling ?? {
        enabled: false,
        lunchThreshold: "13:00",
        dinnerThreshold: "19:00",
        minFillPercent: 20,
      },
    };
  },
});

export const updateSettings = mutation({
  args: { patch: v.any() },
  handler: async () => {
    return { ok: true } as any;
  },
});

export const updateProgressiveFilling = mutation({
  args: {
    enabled: v.boolean(),
    lunchThreshold: v.string(),
    dinnerThreshold: v.string(),
    minFillPercent: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Validate thresholds format HH:MM
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(args.lunchThreshold)) {
      throw Errors.INVALID_INPUT("lunchThreshold", "Format HH:MM requis");
    }
    if (!timeRegex.test(args.dinnerThreshold)) {
      throw Errors.INVALID_INPUT("dinnerThreshold", "Format HH:MM requis");
    }
    if (args.minFillPercent < 0 || args.minFillPercent > 100) {
      throw Errors.INVALID_INPUT("minFillPercent", "Doit être entre 0 et 100");
    }

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    await ctx.db.patch(settings._id, {
      progressiveFilling: {
        enabled: args.enabled,
        lunchThreshold: args.lunchThreshold,
        dinnerThreshold: args.dinnerThreshold,
        minFillPercent: args.minFillPercent,
      },
    });

    return { ok: true };
  },
});

const ALLOWED_SECRET_KEYS = ["turnstileSecretKey", "turnstileSiteKey", "appUrl"] as const;
type SecretKey = (typeof ALLOWED_SECRET_KEYS)[number];

export const updateSecrets = mutation({
  args: {
    turnstileSecretKey: v.optional(v.string()),
    turnstileSiteKey: v.optional(v.string()),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "owner");

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    const patch: Partial<Record<SecretKey, string>> = {};
    if (args.turnstileSecretKey !== undefined) {
      patch.turnstileSecretKey = args.turnstileSecretKey;
    }
    if (args.turnstileSiteKey !== undefined) {
      patch.turnstileSiteKey = args.turnstileSiteKey;
    }
    if (args.appUrl !== undefined) {
      patch.appUrl = args.appUrl;
    }

    const updated = Object.keys(patch) as SecretKey[];
    if (updated.length === 0) {
      return { ok: true, updated: [] };
    }

    await ctx.db.patch(settings._id, patch);

    return { ok: true, updated };
  },
});

// ============================================================================
// Reservation Admin Endpoints
// ============================================================================

/**
 * Build ReservationAdmin DTO from DB document.
 * Pure helper, testable.
 */
function buildReservationAdmin(doc: {
  _id: Id<"reservations">;
  restaurantId: Id<"restaurants">;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  slotKey: string;
  adults: number;
  childrenCount: number;
  babyCount: number;
  partySize: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: "fr" | "nl" | "en" | "de" | "it";
  status: string;
  source: "online" | "admin" | "phone" | "walkin";
  tableIds: Id<"tables">[];
  version: number;
  createdAt: number;
  updatedAt: number;
  cancelledAt: number | null;
  refusedAt: number | null;
  seatedAt: number | null;
  completedAt: number | null;
  noshowAt: number | null;
}) {
  return {
    _id: doc._id,
    restaurantId: doc.restaurantId,
    dateKey: doc.dateKey,
    service: doc.service,
    timeKey: doc.timeKey,
    slotKey: doc.slotKey,
    adults: doc.adults,
    childrenCount: doc.childrenCount,
    babyCount: doc.babyCount,
    partySize: doc.partySize,
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    phone: doc.phone,
    language: doc.language,
    status: doc.status as ReservationStatus,
    source: doc.source,
    tableIds: doc.tableIds,
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    cancelledAt: doc.cancelledAt,
    refusedAt: doc.refusedAt,
    seatedAt: doc.seatedAt,
    completedAt: doc.completedAt,
    noshowAt: doc.noshowAt,
  };
}

/**
 * List reservations with filters and pagination.
 * Contract: reservations.listByService + reservations.listPending combined into admin view.
 * 
 * Autorisation: admin|owner
 */
export const listReservations = query({
  args: {
    dateKey: v.optional(v.string()),
    service: v.optional(v.union(v.literal("lunch"), v.literal("dinner"))),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("seated"),
      v.literal("completed"),
      v.literal("noshow"),
      v.literal("cancelled"),
      v.literal("refused")
    )),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { dateKey, service, status, paginationOpts }) => {
    await requireRole(ctx, "admin");

    // Get active restaurant
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    // Build query based on filters
    let queryBuilder;

    if (dateKey && service) {
      // Use by_restaurant_date_service index
      queryBuilder = ctx.db
        .query("reservations")
        .withIndex("by_restaurant_date_service", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
        );
    } else if (status) {
      // Use by_restaurant_status index
      queryBuilder = ctx.db
        .query("reservations")
        .withIndex("by_restaurant_status", (q) =>
          q.eq("restaurantId", restaurant._id).eq("status", status)
        );
    } else if (dateKey) {
      // Use by_restaurant_date_service with just dateKey (will need to filter service in memory)
      queryBuilder = ctx.db
        .query("reservations")
        .withIndex("by_restaurant_date_service", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey)
        );
    } else {
      // No specific filter, use by_restaurant_status as fallback
      queryBuilder = ctx.db
        .query("reservations")
        .withIndex("by_restaurant_status", (q) =>
          q.eq("restaurantId", restaurant._id)
        );
    }

    // Apply pagination
    const paginatedResult = await queryBuilder.paginate(paginationOpts);

    // Apply additional filters if needed and map to DTO
    let filteredDocs = paginatedResult.page;

    // Filter by service if dateKey was provided but not service
    if (dateKey && !service && service !== undefined) {
      // Already filtered by index
    }

    // Filter by status if not already filtered by index
    if (status && !(status && !dateKey && !service)) {
      filteredDocs = filteredDocs.filter((doc) => doc.status === status);
    }

    // Map to ReservationAdmin
    const page = filteredDocs.map(buildReservationAdmin);

    return {
      page,
      continueCursor: paginatedResult.continueCursor,
      isDone: paginatedResult.isDone,
    };
  },
});

/**
 * Get a single reservation by ID.
 * Contract: reservations.getAdmin
 * 
 * Autorisation: admin|owner
 */
export const getReservation = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, { reservationId }) => {
    await requireRole(ctx, "admin");

    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      throw Errors.SLOT_NOT_FOUND(reservationId);
    }

    return buildReservationAdmin(reservation);
  },
});

/**
 * Update a reservation (admin).
 * Supports status transitions and table assignment.
 * 
 * Autorisation: admin|owner
 * Optimistic locking via version
 */
export const updateReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    expectedVersion: v.number(),
    // Updatable fields
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("seated"),
      v.literal("completed"),
      v.literal("noshow"),
      v.literal("cancelled"),
      v.literal("refused")
    )),
    tableIds: v.optional(v.array(v.id("tables"))),
  },
  handler: async (ctx, { reservationId, expectedVersion, status, tableIds }) => {
    await requireRole(ctx, "admin");

    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      throw Errors.SLOT_NOT_FOUND(reservationId);
    }

    // Version check
    if (reservation.version !== expectedVersion) {
      throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      updatedAt: now,
      version: reservation.version + 1,
    };

    // Status transition
    if (status && status !== reservation.status) {
      if (!isValidStatusTransition(reservation.status as ReservationStatus, status)) {
        throw Errors.INVALID_INPUT(
          "status",
          `Invalid transition from ${reservation.status} to ${status}`
        );
      }

      patch.status = status;

      // Set timestamp fields based on new status
      if (status === "cancelled") {
        patch.cancelledAt = now;
      } else if (status === "refused") {
        patch.refusedAt = now;
      } else if (status === "seated") {
        patch.seatedAt = now;
      } else if (status === "completed") {
        patch.completedAt = now;
      } else if (status === "noshow") {
        patch.noshowAt = now;
      }
    }

    // Table assignment
    if (tableIds !== undefined) {
      // Check for table conflicts
      const currentStatus = status ?? reservation.status;
      if (!["pending", "confirmed", "seated"].includes(currentStatus)) {
        throw Errors.INVALID_INPUT("tableIds", "Cannot assign tables to reservation in this status");
      }

      // Check if any table is already assigned to another reservation on same slotKey
      if (tableIds.length > 0) {
        const conflictingReservations = await ctx.db
          .query("reservations")
          .withIndex("by_restaurant_slotKey", (q) =>
            q.eq("restaurantId", reservation.restaurantId).eq("slotKey", reservation.slotKey)
          )
          .filter((q) =>
            q.and(
              q.neq(q.field("_id"), reservationId),
              q.or(
                q.eq(q.field("status"), "pending"),
                q.eq(q.field("status"), "confirmed"),
                q.eq(q.field("status"), "seated")
              )
            )
          )
          .collect();

        for (const other of conflictingReservations) {
          const conflictingTableIds = tableIds.filter((tid) => other.tableIds.includes(tid));
          if (conflictingTableIds.length > 0) {
            throw Errors.TABLE_CONFLICT(
              reservation.slotKey,
              conflictingTableIds.map((id) => id.toString())
            );
          }
        }
      }

      patch.tableIds = tableIds;
    }

    await ctx.db.patch(reservationId, patch);

    // Log without PII
    const updatedFields = Object.keys(patch).filter((k) => k !== "updatedAt" && k !== "version");
    console.log("Reservation updated", { reservationId, updatedFields, newVersion: patch.version });

    return {
      reservationId,
      newVersion: patch.version as number,
    };
  },
});
