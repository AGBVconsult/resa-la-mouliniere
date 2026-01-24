import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";
import { isValidStatusTransition } from "./lib/stateMachine";
import type { ReservationStatus, Language } from "../spec/contracts.generated";
import { makeSlotKey, computePartySize, computeEffectiveOpen } from "../spec/contracts.generated";
import { generateSecureToken, computeTokenExpiry, computeSlotStartAt } from "./lib/tokens";

const CRM_SCORE_VERSION = "v1";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeEmail(email: string): string {
  return normalize(email);
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^+\d]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

function buildSearchText(client: {
  firstName?: string;
  lastName?: string;
  email?: string;
  primaryPhone: string;
  phones?: string[];
  emails?: string[];
}): string {
  const parts = [
    client.firstName,
    client.lastName,
    client.email,
    client.primaryPhone,
    ...(client.phones ?? []),
    ...(client.emails ?? []),
  ].filter(Boolean);

  return normalize(parts.join(" "));
}

async function getOrCreateClientIdFromReservation(
  ctx: any,
  reservation: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    language: Language;
    source: "online" | "admin" | "phone" | "walkin";
  }
): Promise<Id<"clients">> {
  const phone = normalizePhone(reservation.phone);
  const email = normalizeEmail(reservation.email);
  const now = Date.now();

  const existing = await ctx.db
    .query("clients")
    .withIndex("by_primaryPhone", (q: any) => q.eq("primaryPhone", phone))
    .unique();

  if (existing) {
    const patch: Record<string, unknown> = { lastUpdatedAt: now };
    if (reservation.firstName && !existing.firstName) patch.firstName = reservation.firstName;
    if (reservation.lastName && !existing.lastName) patch.lastName = reservation.lastName;
    if (email && !existing.email) patch.email = email;

    const mergedEmails = new Set([
      ...(existing.emails ?? []),
      ...(existing.email ? [existing.email] : []),
      email,
    ]);
    patch.emails = Array.from(mergedEmails);
    patch.searchText = buildSearchText({
      firstName: (patch.firstName as string | undefined) ?? existing.firstName,
      lastName: (patch.lastName as string | undefined) ?? existing.lastName,
      email: (patch.email as string | undefined) ?? existing.email,
      primaryPhone: phone,
      phones: existing.phones,
      emails: patch.emails as string[],
    });

    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  const clientId = await ctx.db.insert("clients", {
    primaryPhone: phone,
    phones: [],
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    email,
    emails: [email],
    searchText: buildSearchText({
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      email,
      primaryPhone: phone,
      phones: [],
      emails: [email],
    }),
    preferredLanguage: reservation.language,
    totalVisits: 0,
    totalNoShows: 0,
    totalRehabilitatedNoShows: 0,
    totalCancellations: 0,
    totalLateCancellations: 0,
    totalDeparturesBeforeOrder: 0,
    score: 0,
    scoreVersion: CRM_SCORE_VERSION,
    scoreBreakdown: { visits: 0, noshows: 0, lateCancels: 0 },
    clientStatus: "new",
    isBlacklisted: false,
    needsRebuild: false,
    dietaryRestrictions: [],
    tags: [],
    notes: [],
    acquisitionSource: reservation.source,
    firstSeenAt: now,
    lastUpdatedAt: now,
  });

  return clientId;
}

function computeYesterdayDateKey(now: number, timezone: string): string {
  const date = new Date(now);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatter.format(yesterday);
}

async function markClientNeedsRebuild(ctx: any, reservation: any, reason: string): Promise<void> {
  if (!reservation.clientId) return;
  const restaurant = await ctx.db.get(reservation.restaurantId);
  const timezone = restaurant?.timezone ?? "Europe/Brussels";
  const yesterday = computeYesterdayDateKey(Date.now(), timezone);

  if (reservation.dateKey < yesterday) {
    const client = await ctx.db.get(reservation.clientId);
    if (client && !client.needsRebuild) {
      await ctx.db.patch(reservation.clientId, {
        needsRebuild: true,
        needsRebuildReason: reason,
        needsRebuildAt: Date.now(),
      });
    }
  }
}

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
  note?: string;
  options?: string[];
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
    note: doc.note ?? null,
    options: doc.options ?? [],
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
      throw Errors.RESERVATION_NOT_FOUND(reservationId);
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
/**
 * Get punctuality statistics for analytics.
 * Returns average delay, on-time rate, and distribution.
 */
export const getPunctualityStats = query({
  args: {
    dateFrom: v.optional(v.string()), // YYYY-MM-DD
    dateTo: v.optional(v.string()),   // YYYY-MM-DD
  },
  handler: async (ctx, { dateFrom, dateTo }) => {
    await requireRole(ctx, "admin");

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurant = activeRestaurants[0];

    // Get all "seated" status change events
    let events = await ctx.db
      .query("reservationEvents")
      .withIndex("by_eventType", (q) => 
        q.eq("restaurantId", restaurant._id).eq("eventType", "status_change")
      )
      .collect();

    // Filter to only "seated" transitions with delay data
    events = events.filter((e) => 
      e.toStatus === "seated" && 
      e.delayMinutes !== undefined
    );

    // Apply date filters if provided
    if (dateFrom) {
      const fromTimestamp = new Date(dateFrom).getTime();
      events = events.filter((e) => e.createdAt >= fromTimestamp);
    }
    if (dateTo) {
      const toTimestamp = new Date(dateTo).setHours(23, 59, 59, 999);
      events = events.filter((e) => e.createdAt <= toTimestamp);
    }

    if (events.length === 0) {
      return {
        totalArrivals: 0,
        averageDelayMinutes: 0,
        onTimeRate: 0, // % of clients arriving within 10 min of scheduled time
        earlyRate: 0,  // % arriving early
        lateRate: 0,   // % arriving late (>10 min)
        veryLateRate: 0, // % arriving very late (>30 min)
        distribution: {
          veryEarly: 0,  // < -15 min
          early: 0,      // -15 to -1 min
          onTime: 0,     // -1 to +10 min
          late: 0,       // +10 to +30 min
          veryLate: 0,   // > +30 min
        },
      };
    }

    const delays = events.map((e) => e.delayMinutes as number);
    const totalArrivals = delays.length;
    const averageDelayMinutes = Math.round(delays.reduce((a, b) => a + b, 0) / totalArrivals);

    // Calculate distribution
    const distribution = {
      veryEarly: delays.filter((d) => d < -15).length,
      early: delays.filter((d) => d >= -15 && d < 0).length,
      onTime: delays.filter((d) => d >= 0 && d <= 10).length,
      late: delays.filter((d) => d > 10 && d <= 30).length,
      veryLate: delays.filter((d) => d > 30).length,
    };

    const onTimeCount = distribution.onTime + distribution.early + distribution.veryEarly;
    const onTimeRate = Math.round((onTimeCount / totalArrivals) * 100);
    const earlyRate = Math.round(((distribution.early + distribution.veryEarly) / totalArrivals) * 100);
    const lateRate = Math.round((distribution.late / totalArrivals) * 100);
    const veryLateRate = Math.round((distribution.veryLate / totalArrivals) * 100);

    return {
      totalArrivals,
      averageDelayMinutes,
      onTimeRate,
      earlyRate,
      lateRate,
      veryLateRate,
      distribution: {
        veryEarly: Math.round((distribution.veryEarly / totalArrivals) * 100),
        early: Math.round((distribution.early / totalArrivals) * 100),
        onTime: Math.round((distribution.onTime / totalArrivals) * 100),
        late: Math.round((distribution.late / totalArrivals) * 100),
        veryLate: Math.round((distribution.veryLate / totalArrivals) * 100),
      },
    };
  },
});

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
      v.literal("refused"),
      v.literal("incident")
    )),
    tableIds: v.optional(v.array(v.id("tables"))),
  },
  handler: async (ctx, { reservationId, expectedVersion, status, tableIds }) => {
    await requireRole(ctx, "admin");

    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      throw Errors.RESERVATION_NOT_FOUND(reservationId);
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
        patch.markedNoshowAt = reservation.markedNoshowAt ?? now;
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

    if (status && status !== reservation.status) {
      await markClientNeedsRebuild(ctx, reservation, "reservation_backdated_edit");
    }

    // Track status change event for analytics
    if (status && status !== reservation.status) {
      // Calculate delay for "seated" status (arrival time vs scheduled time)
      let delayMinutes: number | undefined;
      if (status === "seated") {
        // Parse scheduled time (e.g., "18:30") and compare with actual time
        const [hours, minutes] = reservation.timeKey.split(":").map(Number);
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);
        
        // Get today's date with the scheduled time
        const todayStr = new Date().toISOString().split("T")[0];
        const reservationDateStr = reservation.dateKey;
        
        // Only calculate delay if it's the same day
        if (todayStr === reservationDateStr) {
          const scheduledTimestamp = scheduledDate.getTime();
          delayMinutes = Math.round((now - scheduledTimestamp) / 60000);
        }
      }

      await ctx.db.insert("reservationEvents", {
        reservationId,
        restaurantId: reservation.restaurantId,
        eventType: "status_change",
        fromStatus: reservation.status,
        toStatus: status,
        scheduledTime: reservation.timeKey,
        actualTime: now,
        delayMinutes,
        performedBy: (await ctx.auth.getUserIdentity())?.subject ?? "admin",
        createdAt: now,
      });
    }

    // Track table assignment event
    if (tableIds !== undefined && JSON.stringify(tableIds) !== JSON.stringify(reservation.tableIds)) {
      const userId = (await ctx.auth.getUserIdentity())?.subject ?? "admin";
      await ctx.db.insert("reservationEvents", {
        reservationId,
        restaurantId: reservation.restaurantId,
        eventType: "table_assignment",
        scheduledTime: reservation.timeKey,
        actualTime: now,
        performedBy: userId,
        metadata: { 
          previousTables: reservation.tableIds,
          newTables: tableIds,
        },
        createdAt: now,
      });
    }

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
 * Create a reservation from admin interface.
 * - No Turnstile validation
 * - Status is always "confirmed" (admin bypass pending)
 * - Source is "admin", "phone", or "walkin"
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
    email: v.string(),
    phone: v.string(),
    language: v.union(
      v.literal("fr"),
      v.literal("nl"),
      v.literal("en"),
      v.literal("de"),
      v.literal("it")
    ),
    note: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    source: v.union(v.literal("admin"), v.literal("phone"), v.literal("walkin")),
    tableIds: v.optional(v.array(v.id("tables"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Get active restaurant
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurant = activeRestaurants[0];

    // Get settings for token expiry
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    const slotKey = makeSlotKey({
      dateKey: args.dateKey,
      service: args.service,
      timeKey: args.timeKey,
    });

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

    // Check effectiveOpen
    const effectiveOpen = computeEffectiveOpen(slot.isOpen, slot.capacity);
    if (!effectiveOpen) {
      throw Errors.SLOT_TAKEN(slotKey, "closed");
    }

    // Compute partySize
    const partySize = computePartySize(args.adults, args.childrenCount, args.babyCount);

    // Calculate used capacity
    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
      )
      .collect();

    const usedCapacity = existingReservations
      .filter((r) => r.status === "pending" || r.status === "confirmed" || r.status === "seated")
      .reduce((sum, r) => sum + r.partySize, 0);

    const remainingCapacity = slot.capacity - usedCapacity;

    if (partySize > remainingCapacity) {
      throw Errors.INSUFFICIENT_CAPACITY(slotKey, partySize, remainingCapacity);
    }

    const now = Date.now();

    const clientId = await getOrCreateClientIdFromReservation(ctx, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      language: args.language as Language,
      source: args.source,
    });

    // Admin reservations are always confirmed
    const status = "confirmed";

    // Create reservation
    const reservationId = await ctx.db.insert("reservations", {
      restaurantId: restaurant._id,
      dateKey: args.dateKey,
      service: args.service,
      timeKey: args.timeKey,
      slotKey,
      clientId,
      adults: args.adults,
      childrenCount: args.childrenCount,
      babyCount: args.babyCount,
      partySize,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      language: args.language,
      note: args.note,
      options: args.options,
      status,
      source: args.source,
      tableIds: args.tableIds ?? [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      refusedAt: null,
      seatedAt: null,
      completedAt: null,
      noshowAt: null,
      markedNoshowAt: null,
    });

    // Create manage token
    const manageToken = generateSecureToken();
    const slotStartAt = computeSlotStartAt(
      args.dateKey,
      args.timeKey,
      restaurant.timezone
    );
    const tokenExpiresAt = computeTokenExpiry(
      slotStartAt,
      settings.manageTokenExpireBeforeSlotMs
    );

    await ctx.db.insert("reservationTokens", {
      reservationId,
      token: manageToken,
      type: "manage",
      expiresAt: tokenExpiresAt,
      usedAt: null,
      rotatedAt: null,
      createdAt: now,
    });

    // Log event
    await ctx.db.insert("reservationEvents", {
      reservationId,
      restaurantId: restaurant._id,
      eventType: "created",
      fromStatus: undefined,
      toStatus: status,
      scheduledTime: args.timeKey,
      actualTime: now,
      performedBy: "admin",
      metadata: { source: args.source },
      createdAt: now,
    });

    // Enqueue confirmation email
    await ctx.scheduler.runAfter(0, internal.emails.enqueue, {
      restaurantId: restaurant._id,
      type: "reservation.confirmed",
      to: args.email,
      subjectKey: "email.reservation.confirmed.subject",
      templateKey: "reservation.confirmed",
      templateData: {
        firstName: args.firstName,
        lastName: args.lastName,
        dateKey: args.dateKey,
        timeKey: args.timeKey,
        service: args.service,
        partySize,
        adults: args.adults,
        childrenCount: args.childrenCount,
        babyCount: args.babyCount,
        language: args.language,
        manageUrl: `${settings.appUrl ?? ""}/reservation/${manageToken}`,
        editUrl: `${settings.appUrl ?? ""}/reservation/${manageToken}/edit`,
        cancelUrl: `${settings.appUrl ?? ""}/reservation/${manageToken}/cancel`,
        note: args.note ?? "",
        options: args.options ?? [],
      },
      dedupeKey: `email:reservation.confirmed:${reservationId}:1`,
    });

    console.log("Admin reservation created", { reservationId, slotKey, status, partySize, source: args.source });

    return {
      reservationId,
      status,
      manageToken,
    };
  },
});
