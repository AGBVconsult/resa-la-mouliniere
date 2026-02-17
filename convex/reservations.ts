import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { Errors } from "./lib/errors";
import {
  makeSlotKey,
  computePartySize,
  computeEffectiveOpen,
  type Service,
  type Language,
  type ReservationStatus,
} from "../spec/contracts.generated";
import { generateSecureToken, computeTokenExpiry, computeSlotStartAt } from "./lib/tokens";
import { verifyTurnstile } from "./lib/turnstile";
import { computeRequestHash } from "./lib/idempotency";

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
    note: doc.note,
    options: doc.options,
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
 * Check if a reservation status allows cancellation.
 * Pure helper, testable.
 */
export function canCancel(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const now = Date.now();

    // Lookup token via index
    const tokenDoc = await ctx.db
      .query("reservationTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    // Token not found
    if (!tokenDoc) {
      throw Errors.TOKEN_INVALID();
    }

    // Token already used
    if (tokenDoc.usedAt !== null) {
      throw Errors.TOKEN_INVALID();
    }

    // Token expired
    if (tokenDoc.expiresAt <= now) {
      throw Errors.TOKEN_EXPIRED();
    }

    // Load reservation
    const reservation = await ctx.db.get(tokenDoc.reservationId);
    if (!reservation) {
      throw Errors.TOKEN_INVALID();
    }

    // Return ReservationView shape
    return {
      reservation: buildReservationAdmin(reservation),
      token: {
        token: tokenDoc.token,
        expiresAt: tokenDoc.expiresAt,
      },
    };
  },
});

/**
 * @deprecated Utilisez api.admin.listReservations à la place
 */
export const listByService = query({
  args: { dateKey: v.string(), service: v.union(v.literal("lunch"), v.literal("dinner")) },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.listReservations à la place");
  },
});

/**
 * @deprecated Utilisez api.admin.listReservations avec filtre status à la place
 */
export const listPending = query({
  args: { dateKey: v.optional(v.string()) },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.listReservations avec filtre status");
  },
});

/**
 * @deprecated Utilisez api.admin.getReservation à la place
 */
export const getAdmin = query({
  args: { reservationId: v.string() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.getReservation à la place");
  },
});

/**
 * @deprecated Utilisez api.admin.getReservation à la place
 */
export const getStaff = query({
  args: { reservationId: v.string() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.getReservation à la place");
  },
});

export const _create = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
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
    source: v.union(v.literal("online"), v.literal("admin"), v.literal("phone"), v.literal("walkin")),
    manageTokenExpireBeforeSlotMs: v.number(),
    timezone: v.string(),
    appUrl: v.string(),
    adminNotificationEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slotKey = makeSlotKey({
      dateKey: args.dateKey,
      service: args.service as Service,
      timeKey: args.timeKey,
    });

    // Load slot via index
    const slot = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("slotKey", slotKey)
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

    // Check maxGroupSize
    if (slot.maxGroupSize !== null && partySize > slot.maxGroupSize) {
      throw Errors.SLOT_TAKEN(slotKey, "taken");
    }

    // Calculate used capacity (pending | confirmed | seated)
    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("slotKey", slotKey)
      )
      .collect();

    const usedCapacity = existingReservations
      .filter((r) => r.status === "pending" || r.status === "confirmed" || r.status === "seated")
      .reduce((sum, r) => sum + r.partySize, 0);

    const remainingCapacity = slot.capacity - usedCapacity;

    if (partySize > remainingCapacity) {
      throw Errors.INSUFFICIENT_CAPACITY(slotKey, partySize, remainingCapacity);
    }

    // Determine initial status based on partySize
    const status: ReservationStatus = partySize <= 4 ? "confirmed" : "pending";

    const now = Date.now();

    const clientId = await getOrCreateClientIdFromReservation(ctx, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      language: args.language as Language,
      source: args.source,
    });

    // Insert reservation
    const reservationId = await ctx.db.insert("reservations", {
      restaurantId: args.restaurantId,
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

    // Compute token expiry
    const slotStartAt = computeSlotStartAt(args.dateKey, args.timeKey, args.timezone);
    const tokenExpiresAt = computeTokenExpiry(slotStartAt, args.manageTokenExpireBeforeSlotMs);

    // Check if token already exists (idempotent: return existing, no rotation)
    const existingToken = await ctx.db
      .query("reservationTokens")
      .withIndex("by_reservation_type", (q) =>
        q.eq("reservationId", reservationId).eq("type", "manage")
      )
      .unique();

    let manageToken: string;
    let finalTokenExpiresAt: number;

    if (existingToken) {
      // Return existing token (no rotation on retry)
      manageToken = existingToken.token;
      finalTokenExpiresAt = existingToken.expiresAt;
    } else {
      // Create new token
      manageToken = generateSecureToken();
      finalTokenExpiresAt = tokenExpiresAt;
      await ctx.db.insert("reservationTokens", {
        reservationId,
        token: manageToken,
        type: "manage",
        expiresAt: finalTokenExpiresAt,
        usedAt: null,
        rotatedAt: null,
        createdAt: now,
      });
    }

    // Log without PII
    console.log("Reservation created", { reservationId, slotKey, status, partySize });

    // Log event for activity feed
    await ctx.db.insert("reservationEvents", {
      reservationId,
      restaurantId: args.restaurantId,
      eventType: "created",
      toStatus: status,
      actualTime: now,
      scheduledTime: args.timeKey,
      performedBy: "client",
      createdAt: now,
    });

    // Enqueue email job based on status
    const emailType = status === "confirmed" 
      ? "reservation.confirmed" 
      : "reservation.pending";
    
    await ctx.scheduler.runAfter(0, internal.emails.enqueue, {
      restaurantId: args.restaurantId,
      type: emailType,
      to: args.email,
      subjectKey: `email.${emailType}.subject`,
      templateKey: emailType,
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
        manageUrl: `${args.appUrl}/reservation/${manageToken}`,
        editUrl: `${args.appUrl}/reservation/${manageToken}/edit`,
        cancelUrl: `${args.appUrl}/reservation/${manageToken}/cancel`,
        note: args.note ?? "",
        options: args.options ?? [],
      },
      dedupeKey: `email:${emailType}:${reservationId}:1`,
    });

    // Send admin notification for pending reservations
    if (status === "pending") {
      // Email notification
      if (args.adminNotificationEmail) {
        await ctx.scheduler.runAfter(0, internal.emails.enqueue, {
          restaurantId: args.restaurantId,
          type: "admin.notification",
          to: args.adminNotificationEmail,
          subjectKey: "admin.notification.subject",
          templateKey: "admin.notification",
          templateData: {
            firstName: args.firstName,
            lastName: args.lastName,
            dateKey: args.dateKey,
            timeKey: args.timeKey,
            service: args.service,
            partySize,
            language: "fr", // Admin emails are always in French
            note: args.note ?? "",
            adminUrl: `${args.appUrl}/admin/reservations?date=${args.dateKey}`,
          },
          dedupeKey: `email:admin.notification:${reservationId}:1`,
        });
        console.log("Admin email notification enqueued", { reservationId });
      }

      // Push notification (Pushover)
      await ctx.scheduler.runAfter(0, internal.notifications.sendAdminPushNotification, {
        type: "pending_reservation",
        reservationId,
      });
    }

    return {
      reservationId,
      status,
      manageToken,
      tokenExpiresAt: finalTokenExpiresAt,
    };
  },
});

export const _cancel = internalMutation({
  args: {
    reservationId: v.id("reservations"),
    cancelledBy: v.union(v.literal("token"), v.literal("admin")),
    now: v.number(),
    expectedVersion: v.number(),
  },
  handler: async (ctx, { reservationId, cancelledBy, now, expectedVersion }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw Errors.TOKEN_INVALID();
    }

    // Check version
    if (reservation.version !== expectedVersion) {
      throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
    }

    // Check status is cancellable
    if (!canCancel(reservation.status)) {
      throw Errors.INVALID_INPUT("status", "Reservation cannot be cancelled");
    }

    // Update reservation
    const newVersion = reservation.version + 1;
    await ctx.db.patch(reservationId, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
      version: newVersion,
    });

    // Log event for activity feed (only for client cancellations)
    if (cancelledBy === "token") {
      await ctx.db.insert("reservationEvents", {
        reservationId,
        restaurantId: reservation.restaurantId,
        eventType: "status_change",
        fromStatus: reservation.status,
        toStatus: "cancelled",
        actualTime: now,
        scheduledTime: reservation.timeKey,
        performedBy: "client",
        createdAt: now,
      });
    }

    // Log without PII
    console.log("Reservation cancelled", { reservationId, cancelledBy, newVersion });

    return { reservationId, newVersion };
  },
});

/**
 * Internal query to get token by value.
 * Used by cancelByToken action.
 */
export const _getTokenByValue = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("reservationTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
  },
});

/**
 * Internal query to get reservation by ID.
 * Used by cancelByToken action.
 */
export const _getById = internalQuery({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    return await ctx.db.get(reservationId);
  },
});

/**
 * Internal mutation to mark token as used.
 * Used by cancelByToken action.
 */
export const _markTokenUsed = internalMutation({
  args: { tokenId: v.id("reservationTokens"), usedAt: v.number() },
  handler: async (ctx, { tokenId, usedAt }) => {
    await ctx.db.patch(tokenId, { usedAt });
  },
});

/**
 * @deprecated Utilisez api.admin.updateReservation avec status: "confirmed" à la place
 */
export const adminConfirm = mutation({
  args: { reservationId: v.string(), expectedVersion: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.updateReservation avec status: 'confirmed'");
  },
});

/**
 * @deprecated Utilisez api.admin.updateReservation avec status: "refused" à la place
 */
export const adminRefuse = mutation({
  args: { reservationId: v.string(), reasonKey: v.string(), expectedVersion: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.updateReservation avec status: 'refused'");
  },
});

/**
 * @deprecated Utilisez api.admin.updateReservation avec status: "cancelled" à la place
 */
export const adminCancel = mutation({
  args: { reservationId: v.string(), expectedVersion: v.number(), now: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.updateReservation avec status: 'cancelled'");
  },
});

/**
 * @deprecated Utilisez api.admin.updateReservation avec status: "seated" à la place
 */
export const checkIn = mutation({
  args: { reservationId: v.string(), expectedVersion: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.updateReservation avec status: 'seated'");
  },
});

/**
 * @deprecated Utilisez api.admin.updateReservation avec status: "completed" à la place
 */
export const checkOut = mutation({
  args: { reservationId: v.string(), expectedVersion: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.admin.updateReservation avec status: 'completed'");
  },
});

const payloadSchema = {
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
};

type ReservationCreateResult =
  | { kind: "reservation"; reservationId: Id<"reservations">; status: ReservationStatus; manageUrlPath: string }
  | { kind: "groupRequest"; groupRequestId: Id<"groupRequests"> };

type IdempotencyCheckResult =
  | { found: false }
  | { found: true; hashMismatch: true }
  | { found: true; hashMismatch: false; resultData: unknown };

type SettingsInternal = {
  restaurantId: Id<"restaurants">;
  timezone: string;
  appUrl: string;
  turnstileSecretKey: string;
  manageTokenExpireBeforeSlotMs: number;
  rateLimit: { windowMs: number; maxRequests: number };
  adminNotificationEmail?: string;
} | null;

type CreateMutationResult = {
  reservationId: Id<"reservations">;
  status: ReservationStatus;
  manageToken: string;
  tokenExpiresAt: number;
};

export const create = action({
  args: {
    payload: v.object(payloadSchema),
    turnstileToken: v.string(),
    idemKey: v.string(),
  },
  handler: async (ctx, args): Promise<ReservationCreateResult> => {
    const { payload, turnstileToken, idemKey } = args;

    // Validate dateKey format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }

    // Validate timeKey format
    if (!/^\d{2}:\d{2}$/.test(payload.timeKey)) {
      throw Errors.INVALID_INPUT("timeKey", "Format HH:MM requis");
    }

    // Validate adults >= 1
    if (payload.adults < 1) {
      throw Errors.INVALID_INPUT("adults", "Doit être >= 1");
    }

    // Compute partySize for routing
    const partySize = computePartySize(payload.adults, payload.childrenCount, payload.babyCount);

    // Compute request hash for idempotency
    const requestHash = computeRequestHash({
      ...payload,
      partySize,
    });

    // Check idempotency
    const idemCheck: IdempotencyCheckResult = await ctx.runQuery(internal.lib.idempotency.check, {
      key: idemKey,
      requestHash,
    });

    if (idemCheck.found) {
      if (idemCheck.hashMismatch) {
        throw Errors.INVALID_INPUT("idemKey", "Idempotency key already used with different payload");
      }
      // Return cached result
      return idemCheck.resultData as ReservationCreateResult;
    }

    // Load settings (including secrets) via internal mutation
    const settings: SettingsInternal = await ctx.runMutation(internal.settings.getSecretsInternal, {});

    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    // Verify Turnstile
    const turnstileResult = await verifyTurnstile(turnstileToken, settings.turnstileSecretKey);
    if (!turnstileResult.success) {
      throw Errors.TURNSTILE_FAILED({
        errorCodes: turnstileResult.errorCodes,
        reason: turnstileResult.reason,
      });
    }

    // Route to groupRequest if partySize >= 16
    if (partySize >= 16) {
      const groupRequestId: Id<"groupRequests"> = await ctx.runMutation(internal.groupRequests._insert, {
        restaurantId: settings.restaurantId,
        partySize,
        preferredDateKey: payload.dateKey,
        preferredService: payload.service,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        message: "",
        language: payload.language,
        now: Date.now(),
      });

      const result: ReservationCreateResult = { kind: "groupRequest", groupRequestId };

      // Store idempotency result
      await ctx.runMutation(internal.lib.idempotency.store, {
        key: idemKey,
        action: "reservations.create",
        requestHash,
        resultData: result,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
      });

      return result;
    }

    // Create reservation via internal mutation
    const createResult: CreateMutationResult = await ctx.runMutation(internal.reservations._create, {
      restaurantId: settings.restaurantId,
      dateKey: payload.dateKey,
      service: payload.service,
      timeKey: payload.timeKey,
      adults: payload.adults,
      childrenCount: payload.childrenCount,
      babyCount: payload.babyCount,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      language: payload.language,
      note: payload.note,
      options: payload.options,
      source: "online",
      manageTokenExpireBeforeSlotMs: settings.manageTokenExpireBeforeSlotMs,
      timezone: settings.timezone,
      appUrl: settings.appUrl,
      adminNotificationEmail: settings.adminNotificationEmail,
    });

    const result: ReservationCreateResult = {
      kind: "reservation",
      reservationId: createResult.reservationId,
      status: createResult.status,
      manageUrlPath: `/reservation/${createResult.manageToken}`,
    };

    // Store idempotency result
    await ctx.runMutation(internal.lib.idempotency.store, {
      key: idemKey,
      action: "reservations.create",
      requestHash,
      resultData: result,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    // Email is now enqueued in _create mutation

    return result;
  },
});

/**
 * Check if a reservation status allows modification.
 * Pure helper, testable.
 */
export function canModify(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

export const _update = internalMutation({
  args: {
    reservationId: v.id("reservations"),
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
    adults: v.number(),
    childrenCount: v.number(),
    babyCount: v.number(),
    note: v.optional(v.string()),
    expectedVersion: v.number(),
    now: v.number(),
    timezone: v.string(),
    appUrl: v.string(),
    manageToken: v.string(),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw Errors.TOKEN_INVALID();
    }

    // Check version for optimistic locking
    if (reservation.version !== args.expectedVersion) {
      throw Errors.VERSION_CONFLICT(args.expectedVersion, reservation.version);
    }

    // Check status allows modification
    if (!canModify(reservation.status)) {
      throw Errors.INVALID_INPUT("status", "Reservation cannot be modified");
    }

    // Build new slotKey
    const newSlotKey = makeSlotKey({
      dateKey: args.dateKey,
      service: args.service as Service,
      timeKey: args.timeKey,
    });

    // Load new slot
    const newSlot = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", reservation.restaurantId).eq("slotKey", newSlotKey)
      )
      .unique();

    if (!newSlot) {
      throw Errors.SLOT_NOT_FOUND(newSlotKey);
    }

    // Check effectiveOpen
    const effectiveOpen = computeEffectiveOpen(newSlot.isOpen, newSlot.capacity);
    if (!effectiveOpen) {
      throw Errors.SLOT_TAKEN(newSlotKey, "closed");
    }

    // Compute new partySize
    const newPartySize = computePartySize(args.adults, args.childrenCount, args.babyCount);

    // Check maxGroupSize
    if (newSlot.maxGroupSize !== null && newPartySize > newSlot.maxGroupSize) {
      throw Errors.SLOT_TAKEN(newSlotKey, "taken");
    }

    // Calculate used capacity (excluding current reservation)
    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", reservation.restaurantId).eq("slotKey", newSlotKey)
      )
      .collect();

    const usedCapacity = existingReservations
      .filter((r) =>
        r._id !== args.reservationId &&
        (r.status === "pending" || r.status === "confirmed" || r.status === "seated")
      )
      .reduce((sum, r) => sum + r.partySize, 0);

    const remainingCapacity = newSlot.capacity - usedCapacity;

    if (newPartySize > remainingCapacity) {
      throw Errors.INSUFFICIENT_CAPACITY(newSlotKey, newPartySize, remainingCapacity);
    }

    // Determine new status based on partySize (same logic as create)
    const newStatus: ReservationStatus = newPartySize <= 4 ? "confirmed" : "pending";

    const newVersion = reservation.version + 1;

    // Update reservation
    await ctx.db.patch(args.reservationId, {
      dateKey: args.dateKey,
      service: args.service,
      timeKey: args.timeKey,
      slotKey: newSlotKey,
      adults: args.adults,
      childrenCount: args.childrenCount,
      babyCount: args.babyCount,
      partySize: newPartySize,
      note: args.note,
      status: newStatus,
      updatedAt: args.now,
      version: newVersion,
    });

    // Log without PII
    console.log("Reservation updated", {
      reservationId: args.reservationId,
      oldSlotKey: reservation.slotKey,
      newSlotKey,
      newStatus,
      newPartySize,
      newVersion
    });

    // Log event for activity feed (client modification)
    await ctx.db.insert("reservationEvents", {
      reservationId: args.reservationId,
      restaurantId: reservation.restaurantId,
      eventType: "updated",
      fromStatus: reservation.status,
      toStatus: newStatus,
      actualTime: args.now,
      scheduledTime: args.timeKey,
      performedBy: "client",
      createdAt: args.now,
    });

    // Enqueue confirmation email
    const emailType = newStatus === "confirmed"
      ? "reservation.confirmed"
      : "reservation.pending";

    await ctx.scheduler.runAfter(0, internal.emails.enqueue, {
      restaurantId: reservation.restaurantId,
      type: emailType,
      to: reservation.email,
      subjectKey: `email.${emailType}.subject`,
      templateKey: emailType,
      templateData: {
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        dateKey: args.dateKey,
        timeKey: args.timeKey,
        service: args.service,
        partySize: newPartySize,
        adults: args.adults,
        childrenCount: args.childrenCount,
        babyCount: args.babyCount,
        language: reservation.language,
        manageUrl: `${args.appUrl}/reservation/${args.manageToken}`,
        editUrl: `${args.appUrl}/reservation/${args.manageToken}/edit`,
        cancelUrl: `${args.appUrl}/reservation/${args.manageToken}/cancel`,
        note: args.note ?? "",
        options: reservation.options ?? [],
      },
      dedupeKey: `email:${emailType}:${args.reservationId}:${newVersion}`,
    });

    return {
      reservationId: args.reservationId,
      status: newStatus,
      newVersion,
    };
  },
});

type UpdateByTokenResult = {
  reservationId: Id<"reservations">;
  status: ReservationStatus;
};

export const updateByToken = action({
  args: {
    token: v.string(),
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
    adults: v.number(),
    childrenCount: v.number(),
    babyCount: v.number(),
    note: v.optional(v.string()),
    idemKey: v.string(),
  },
  handler: async (ctx, args): Promise<UpdateByTokenResult> => {
    const { token, idemKey, ...updateData } = args;
    const now = Date.now();

    // Validate dateKey format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(updateData.dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }

    // Validate timeKey format
    if (!/^\d{2}:\d{2}$/.test(updateData.timeKey)) {
      throw Errors.INVALID_INPUT("timeKey", "Format HH:MM requis");
    }

    // Validate adults >= 1
    if (updateData.adults < 1) {
      throw Errors.INVALID_INPUT("adults", "Doit être >= 1");
    }

    // Compute request hash for idempotency
    const requestHash = computeRequestHash({ token, ...updateData });

    // Check idempotency
    const idemCheck: IdempotencyCheckResult = await ctx.runQuery(internal.lib.idempotency.check, {
      key: idemKey,
      requestHash,
    });

    if (idemCheck.found) {
      if (idemCheck.hashMismatch) {
        throw Errors.INVALID_INPUT("idemKey", "Idempotency key already used with different payload");
      }
      return idemCheck.resultData as UpdateByTokenResult;
    }

    // Lookup token
    const tokenDoc = await ctx.runQuery(internal.reservations._getTokenByValue, { token });

    if (!tokenDoc) {
      throw Errors.TOKEN_INVALID();
    }

    if (tokenDoc.usedAt !== null) {
      throw Errors.TOKEN_INVALID();
    }

    if (tokenDoc.expiresAt <= now) {
      throw Errors.TOKEN_EXPIRED();
    }

    // Load reservation
    const reservation = await ctx.runQuery(internal.reservations._getById, {
      reservationId: tokenDoc.reservationId,
    });

    if (!reservation) {
      throw Errors.TOKEN_INVALID();
    }

    // Check if modifiable
    if (!canModify(reservation.status)) {
      throw Errors.INVALID_INPUT("status", "Reservation cannot be modified");
    }

    // Load settings for timezone and appUrl
    const settings = await ctx.runMutation(internal.settings.getSecretsInternal, {});
    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    // Call _update internal mutation
    const updateResult = await ctx.runMutation(internal.reservations._update, {
      reservationId: tokenDoc.reservationId,
      dateKey: updateData.dateKey,
      service: updateData.service,
      timeKey: updateData.timeKey,
      adults: updateData.adults,
      childrenCount: updateData.childrenCount,
      babyCount: updateData.babyCount,
      note: updateData.note,
      expectedVersion: reservation.version,
      now,
      timezone: settings.timezone,
      appUrl: settings.appUrl,
      manageToken: token,
    });

    const result: UpdateByTokenResult = {
      reservationId: updateResult.reservationId,
      status: updateResult.status,
    };

    // Store idempotency result
    await ctx.runMutation(internal.lib.idempotency.store, {
      key: idemKey,
      action: "reservations.updateByToken",
      requestHash,
      resultData: result,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    return result;
  },
});

type CancelByTokenResult = { reservationId: Id<"reservations"> };

export const cancelByToken = action({
  args: { token: v.string(), idemKey: v.string() },
  handler: async (ctx, { token, idemKey }): Promise<CancelByTokenResult> => {
    const now = Date.now();

    // Compute request hash for idempotency (token is the only input)
    const requestHash = computeRequestHash({ token });

    // Check idempotency
    const idemCheck: IdempotencyCheckResult = await ctx.runQuery(internal.lib.idempotency.check, {
      key: idemKey,
      requestHash,
    });

    if (idemCheck.found) {
      if (idemCheck.hashMismatch) {
        throw Errors.INVALID_INPUT("idemKey", "Idempotency key already used with different payload");
      }
      // Return cached result
      return idemCheck.resultData as CancelByTokenResult;
    }

    // Lookup token via internal query
    const tokenDoc = await ctx.runQuery(internal.reservations._getTokenByValue, { token });

    // Token not found
    if (!tokenDoc) {
      throw Errors.TOKEN_INVALID();
    }

    // Token already used
    if (tokenDoc.usedAt !== null) {
      throw Errors.TOKEN_INVALID();
    }

    // Token expired
    if (tokenDoc.expiresAt <= now) {
      throw Errors.TOKEN_EXPIRED();
    }

    // Load reservation to get current version and status
    const reservation = await ctx.runQuery(internal.reservations._getById, {
      reservationId: tokenDoc.reservationId,
    });

    if (!reservation) {
      throw Errors.TOKEN_INVALID();
    }

    // Check if cancellable
    if (!canCancel(reservation.status)) {
      throw Errors.INVALID_INPUT("status", "Reservation cannot be cancelled");
    }

    // Call _cancel internal mutation
    await ctx.runMutation(internal.reservations._cancel, {
      reservationId: tokenDoc.reservationId,
      cancelledBy: "token",
      now,
      expectedVersion: reservation.version,
    });

    // Invalidate token (mark as used)
    await ctx.runMutation(internal.reservations._markTokenUsed, {
      tokenId: tokenDoc._id,
      usedAt: now,
    });

    const result: CancelByTokenResult = { reservationId: tokenDoc.reservationId };

    // Store idempotency result
    await ctx.runMutation(internal.lib.idempotency.store, {
      key: idemKey,
      action: "reservations.cancelByToken",
      requestHash,
      resultData: result,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24h
    });

    // Enqueue cancellation email
    // Need to get restaurant settings for email
    const settings = await ctx.runMutation(internal.settings.getSecretsInternal, {});
    if (settings) {
      await ctx.runMutation(internal.emails.enqueue, {
        restaurantId: settings.restaurantId,
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
          language: reservation.language,
        },
        dedupeKey: `email:reservation.cancelled:${tokenDoc.reservationId}:${reservation.version + 1}`,
      });
    }

    return result;
  },
});
