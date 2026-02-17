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
  primaryTableId?: Id<"tables">;
  version: number;
  createdAt: number;
  updatedAt: number;
  cancelledAt: number | null;
  refusedAt: number | null;
  seatedAt: number | null;
  completedAt: number | null;
  noshowAt: number | null;
}, totalVisits: number = 0) {
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
    primaryTableId: doc.primaryTableId ?? null,
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    cancelledAt: doc.cancelledAt,
    refusedAt: doc.refusedAt,
    seatedAt: doc.seatedAt,
    completedAt: doc.completedAt,
    noshowAt: doc.noshowAt,
    totalVisits,
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

    // Collect unique phone numbers to batch lookup clients
    const phoneSet = new Set(filteredDocs.map((doc) => normalizePhone(doc.phone)));
    const phones = Array.from(phoneSet);
    
    // Batch lookup clients by phone
    const clientsMap = new Map<string, number>();
    for (const phone of phones) {
      const client = await ctx.db
        .query("clients")
        .withIndex("by_primaryPhone", (q) => q.eq("primaryPhone", phone))
        .unique();
      if (client) {
        clientsMap.set(phone, client.totalVisits);
      }
    }

    // Map to ReservationAdmin with totalVisits
    const page = filteredDocs.map((doc) => {
      const normalizedPhone = normalizePhone(doc.phone);
      const totalVisits = clientsMap.get(normalizedPhone) ?? 0;
      return buildReservationAdmin(doc, totalVisits);
    });

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

    // Lookup client totalVisits
    const phone = normalizePhone(reservation.phone);
    const client = await ctx.db
      .query("clients")
      .withIndex("by_primaryPhone", (q) => q.eq("primaryPhone", phone))
      .unique();
    const totalVisits = client?.totalVisits ?? 0;

    return buildReservationAdmin(reservation, totalVisits);
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

    // Send email notification for status changes
    if (status && status !== reservation.status) {
      // Get settings for appUrl
      const settings = await ctx.db
        .query("settings")
        .withIndex("by_restaurantId", (q) => q.eq("restaurantId", reservation.restaurantId))
        .unique();

      // Get manage token for URLs
      const tokenDoc = await ctx.db
        .query("reservationTokens")
        .withIndex("by_reservation_type", (q) =>
          q.eq("reservationId", reservationId).eq("type", "manage")
        )
        .unique();

      const manageToken = tokenDoc?.token ?? "";
      const appUrl = settings?.appUrl ?? "";
      const newVersion = patch.version as number;

      // Determine email type based on status transition
      let emailType: "reservation.validated" | "reservation.cancelled" | "reservation.refused" | "reservation.noshow" | "reservation.cancelled_by_restaurant" | null = null;

      if (status === "confirmed" && reservation.status === "pending") {
        emailType = "reservation.validated";
      } else if (status === "cancelled") {
        // Admin cancellation = cancelled by restaurant
        emailType = "reservation.cancelled_by_restaurant";
      } else if (status === "refused") {
        emailType = "reservation.refused";
      } else if (status === "noshow") {
        emailType = "reservation.noshow";
      }

      if (emailType && settings) {
        await ctx.scheduler.runAfter(0, internal.emails.enqueue, {
          restaurantId: reservation.restaurantId,
          type: emailType,
          to: reservation.email,
          subjectKey: `email.${emailType}.subject`,
          templateKey: emailType,
          templateData: {
            firstName: reservation.firstName,
            lastName: reservation.lastName,
            dateKey: reservation.dateKey,
            timeKey: reservation.timeKey,
            service: reservation.service,
            partySize: reservation.partySize,
            adults: reservation.adults,
            childrenCount: reservation.childrenCount,
            babyCount: reservation.babyCount,
            language: reservation.language,
            manageUrl: `${appUrl}/reservation/${manageToken}`,
            editUrl: `${appUrl}/reservation/${manageToken}/edit`,
            cancelUrl: `${appUrl}/reservation/${manageToken}/cancel`,
            note: reservation.note ?? "",
            options: reservation.options ?? [],
          },
          dedupeKey: `email:${emailType}:${reservationId}:${newVersion}`,
        });

        console.log("Status change email enqueued", { reservationId, emailType, newVersion });
      }
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
 * Cancel a reservation as if the client cancelled it.
 * This sends the "reservation.cancelled" email (client cancellation) instead of
 * "reservation.cancelled_by_restaurant" (admin cancellation).
 */
export const cancelByClient = mutation({
  args: {
    reservationId: v.id("reservations"),
    expectedVersion: v.number(),
  },
  handler: async (ctx, { reservationId, expectedVersion }) => {
    await requireRole(ctx, "admin");

    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw Errors.RESERVATION_NOT_FOUND(reservationId);
    }

    // Check optimistic concurrency
    if (reservation.version !== expectedVersion) {
      throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
    }

    // Check status is cancellable
    const cancellableStatuses = ["pending", "confirmed"];
    if (!cancellableStatuses.includes(reservation.status)) {
      throw Errors.INVALID_INPUT("status", "Reservation cannot be cancelled");
    }

    const now = Date.now();
    const newVersion = reservation.version + 1;

    // Update reservation
    await ctx.db.patch(reservationId, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
      version: newVersion,
    });

    // Get settings for email
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", reservation.restaurantId))
      .unique();

    // Get manage token for URLs
    const tokenDoc = await ctx.db
      .query("reservationTokens")
      .withIndex("by_reservation_type", (q) =>
        q.eq("reservationId", reservationId).eq("type", "manage")
      )
      .unique();

    const manageToken = tokenDoc?.token ?? "";
    const appUrl = settings?.appUrl ?? "";

    // Send client cancellation email (not restaurant cancellation)
    if (settings) {
      await ctx.scheduler.runAfter(0, internal.emails.enqueue, {
        restaurantId: reservation.restaurantId,
        type: "reservation.cancelled",
        to: reservation.email,
        subjectKey: "email.reservation.cancelled.subject",
        templateKey: "reservation.cancelled",
        templateData: {
          firstName: reservation.firstName,
          lastName: reservation.lastName,
          dateKey: reservation.dateKey,
          timeKey: reservation.timeKey,
          service: reservation.service,
          partySize: reservation.partySize,
          adults: reservation.adults,
          childrenCount: reservation.childrenCount,
          babyCount: reservation.babyCount,
          language: reservation.language,
          manageUrl: `${appUrl}/reservation/${manageToken}`,
          editUrl: `${appUrl}/reservation/${manageToken}/edit`,
          cancelUrl: `${appUrl}/reservation/${manageToken}/cancel`,
          note: reservation.note ?? "",
          options: reservation.options ?? [],
        },
        dedupeKey: `email:reservation.cancelled:${reservationId}:${newVersion}`,
      });

      console.log("Client cancellation email enqueued", { reservationId, newVersion });
    }

    // Track status change event
    await ctx.db.insert("reservationEvents", {
      reservationId,
      restaurantId: reservation.restaurantId,
      eventType: "status_change",
      fromStatus: reservation.status,
      toStatus: "cancelled",
      scheduledTime: reservation.timeKey,
      actualTime: now,
      performedBy: (await ctx.auth.getUserIdentity())?.subject ?? "admin",
      metadata: { cancelledBy: "client" },
      createdAt: now,
    });

    console.log("Reservation cancelled by client (admin action)", { reservationId, newVersion });

    return { reservationId, newVersion };
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

/**
 * Import a reservation manually without sending email.
 * Used for migration from another booking system.
 * 
 * Autorisation: admin|owner
 */
export const importReservation = mutation({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
    adults: v.number(),
    childrenCount: v.number(),
    babyCount: v.number(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    language: v.union(
      v.literal("fr"),
      v.literal("nl"),
      v.literal("en"),
      v.literal("de"),
      v.literal("it")
    ),
    note: v.optional(v.string()),
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

    // Get settings
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

    // Load slot - for import we don't require it to exist
    const slot = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
      )
      .unique();

    // For import, we don't check capacity or slot existence - just create the reservation
    const partySize = computePartySize(args.adults, args.childrenCount, args.babyCount);
    const now = Date.now();

    // Use placeholder email/phone if not provided
    const email = args.email?.trim() || "import@placeholder.local";
    const phone = args.phone?.trim() || "+32000000000";

    const clientId = await getOrCreateClientIdFromReservation(ctx, {
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      phone,
      language: args.language as Language,
      source: "admin",
    });

    // Import reservations are always confirmed
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
      email,
      phone,
      language: args.language,
      note: args.note ? `[IMPORT] ${args.note}` : "[IMPORT]",
      options: [],
      status,
      source: "admin",
      tableIds: [],
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

    // Create manage token (even if not used)
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
      metadata: { source: "import", note: "Migration import - no email sent" },
      createdAt: now,
    });

    // NO EMAIL SENT - This is the key difference from createReservation

    console.log("Import reservation created (no email)", { reservationId, slotKey, status, partySize });

    return {
      reservationId,
      status,
    };
  },
});

/**
 * List pending reservations for notification bell.
 * Returns all reservations with status "pending" for the active restaurant.
 * 
 * Autorisation: admin|owner
 */
export const listPendingReservations = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      return [];
    }

    const restaurant = activeRestaurants[0];

    const pendingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_status", (q) =>
        q.eq("restaurantId", restaurant._id).eq("status", "pending")
      )
      .order("desc")
      .collect();

    // Batch lookup clients by phone for totalVisits
    const phoneSet = new Set(pendingReservations.map((doc) => normalizePhone(doc.phone)));
    const phones = Array.from(phoneSet);
    const clientsMap = new Map<string, number>();
    for (const phone of phones) {
      const client = await ctx.db
        .query("clients")
        .withIndex("by_primaryPhone", (q) => q.eq("primaryPhone", phone))
        .unique();
      if (client) {
        clientsMap.set(phone, client.totalVisits);
      }
    }

    return pendingReservations.map((doc) => {
      const totalVisits = clientsMap.get(normalizePhone(doc.phone)) ?? 0;
      return buildReservationAdmin(doc, totalVisits);
    });
  },
});

/**
 * List recent reservation activity (created, status changes).
 * Returns the most recent events for the activity feed.
 * 
 * Autorisation: admin|owner
 */
export const listRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      return [];
    }

    const restaurant = activeRestaurants[0];
    const limit = args.limit ?? 50;

    // Get recent events
    const events = await ctx.db
      .query("reservationEvents")
      .withIndex("by_restaurant_date", (q) => q.eq("restaurantId", restaurant._id))
      .order("desc")
      .take(limit);

    // Get reservation details for each event
    const reservationIds = [...new Set(events.map((e) => e.reservationId))];
    const reservationsMap = new Map<string, any>();
    
    for (const resId of reservationIds) {
      const reservation = await ctx.db.get(resId);
      if (reservation) {
        reservationsMap.set(resId, reservation);
      }
    }

    return events.map((event) => {
      const reservation = reservationsMap.get(event.reservationId);
      return {
        _id: event._id,
        eventType: event.eventType,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        createdAt: event.createdAt,
        reservation: reservation ? {
          _id: reservation._id,
          firstName: reservation.firstName,
          lastName: reservation.lastName,
          dateKey: reservation.dateKey,
          service: reservation.service,
          timeKey: reservation.timeKey,
          partySize: reservation.partySize,
          status: reservation.status,
          source: reservation.source,
        } : null,
      };
    });
  },
});
