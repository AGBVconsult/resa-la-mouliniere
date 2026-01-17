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

    // SettingsAdmin = SettingsPublic + { resendFromEmail, resendFromName, manageTokenExpireBeforeSlotMs, rateLimit }
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
    };
  },
});

export const updateSettings = mutation({
  args: { patch: v.any() },
  handler: async () => {
    return { ok: true } as any;
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
 * List all tables for the active restaurant.
 * Used for table assignment in admin interface.
 *
 * Autorisation: admin|owner|staff
 */
export const listTables = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "staff");

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

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) =>
        q.eq("restaurantId", restaurant._id).eq("isActive", true)
      )
      .collect();

    return tables.map((t) => ({
      _id: t._id,
      name: t.name,
      zone: t.zone,
      capacity: t.capacity,
      gridX: t.gridX,
      gridY: t.gridY,
    }));
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

/**
 * Create a reservation from admin (phone, walk-in).
 * Bypasses Turnstile validation.
 * Status is always "confirmed" regardless of party size.
 *
 * Autorisation: admin|owner|staff
 */
export const createReservation = mutation({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
    adults: v.number(),
    childrenCount: v.number(),
    babyCount: v.number(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    note: v.optional(v.string()),
    source: v.union(v.literal("admin"), v.literal("phone"), v.literal("walkin")),
    language: v.optional(v.union(
      v.literal("fr"),
      v.literal("nl"),
      v.literal("en"),
      v.literal("de"),
      v.literal("it")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

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

    // Build slotKey
    const slotKey = `${args.dateKey}#${args.service}#${args.timeKey}`;

    // Load slot
    const slot = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
      )
      .unique();

    if (!slot) {
      throw Errors.SLOT_NOT_FOUND(slotKey);
    }

    // Check slot is open
    if (!slot.isOpen || slot.capacity <= 0) {
      throw Errors.SLOT_TAKEN(slotKey, "closed");
    }

    // Compute partySize
    const partySize = args.adults + args.childrenCount + args.babyCount;

    // Check capacity
    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
      )
      .collect();

    const usedCapacity = existingReservations
      .filter((r) => ["pending", "confirmed", "seated"].includes(r.status))
      .reduce((sum, r) => sum + r.partySize, 0);

    const remainingCapacity = slot.capacity - usedCapacity;

    if (partySize > remainingCapacity) {
      throw Errors.INSUFFICIENT_CAPACITY(slotKey, partySize, remainingCapacity);
    }

    const now = Date.now();
    const language = args.language ?? "fr";

    // Create reservation with status "confirmed" (admin bypass)
    const reservationId = await ctx.db.insert("reservations", {
      restaurantId: restaurant._id,
      dateKey: args.dateKey,
      service: args.service,
      timeKey: args.timeKey,
      slotKey,
      adults: args.adults,
      childrenCount: args.childrenCount,
      babyCount: args.babyCount,
      partySize,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email ?? "",
      phone: args.phone,
      language,
      note: args.note,
      options: [],
      status: "confirmed", // Always confirmed for admin
      source: args.source,
      tableIds: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      refusedAt: null,
      seatedAt: null,
      completedAt: null,
      noshowAt: null,
    });

    // Log without PII
    console.log("Admin reservation created", {
      reservationId,
      slotKey,
      partySize,
      source: args.source,
    });

    // TODO: Send confirmation email if email provided
    // (would need to get settings and enqueue email)

    return {
      reservationId,
      status: "confirmed" as const,
    };
  },
});

/**
 * Search clients by name, email, or phone.
 * Returns client info with reservation count and last visit.
 *
 * Autorisation: admin|owner|staff
 */
export const searchClients = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query: searchQuery, limit = 20 }) => {
    await requireRole(ctx, "staff");

    if (searchQuery.trim().length < 2) {
      return [];
    }

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
    const queryLower = searchQuery.toLowerCase().trim();

    // Search all reservations and filter by name/email/phone
    // Note: In production, you'd want a proper search index
    const allReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_status", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Group by client (email or phone as key)
    const clientMap = new Map<
      string,
      {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        reservationCount: number;
        lastVisitDate: string | null;
        lastVisitStatus: string | null;
      }
    >();

    for (const res of allReservations) {
      // Check if matches search query
      const matchesName =
        res.firstName.toLowerCase().includes(queryLower) ||
        res.lastName.toLowerCase().includes(queryLower) ||
        `${res.firstName} ${res.lastName}`.toLowerCase().includes(queryLower);
      const matchesEmail = res.email.toLowerCase().includes(queryLower);
      const matchesPhone = res.phone.includes(queryLower);

      if (!matchesName && !matchesEmail && !matchesPhone) {
        continue;
      }

      // Use email as primary key, fallback to phone
      const clientKey = res.email || res.phone;

      const existing = clientMap.get(clientKey);
      if (existing) {
        existing.reservationCount++;
        // Update last visit if this is more recent
        if (!existing.lastVisitDate || res.dateKey > existing.lastVisitDate) {
          existing.lastVisitDate = res.dateKey;
          existing.lastVisitStatus = res.status;
        }
      } else {
        clientMap.set(clientKey, {
          firstName: res.firstName,
          lastName: res.lastName,
          email: res.email,
          phone: res.phone,
          reservationCount: 1,
          lastVisitDate: res.dateKey,
          lastVisitStatus: res.status,
        });
      }
    }

    // Convert to array and sort by reservation count
    const clients = Array.from(clientMap.values())
      .sort((a, b) => b.reservationCount - a.reservationCount)
      .slice(0, limit);

    return clients;
  },
});
