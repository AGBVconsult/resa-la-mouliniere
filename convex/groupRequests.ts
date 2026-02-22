import { action, internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Errors } from "./lib/errors";
import { computeRequestHash } from "./lib/idempotency";
import { requireRole } from "./lib/rbac";

// ═══════════════════════════════════════════════════════════════
// CONSTANTES (CONTRACTS.md §5.7)
// ═══════════════════════════════════════════════════════════════

const MIN_GROUP_SIZE = 16;
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ═══════════════════════════════════════════════════════════════
// VALIDATORS (réutilisables)
// ═══════════════════════════════════════════════════════════════

const payloadValidator = v.object({
  partySize: v.number(),
  preferredDateKey: v.string(),
  preferredService: v.union(v.literal("lunch"), v.literal("dinner")),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.string(),
  message: v.string(),
  language: v.union(
    v.literal("fr"),
    v.literal("nl"),
    v.literal("en"),
    v.literal("de"),
    v.literal("it"),
    v.literal("es")
  ),
});

const groupRequestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("contacted"),
  v.literal("converted"),
  v.literal("declined")
);

// ═══════════════════════════════════════════════════════════════
// ACTION PUBLIQUE : create (CONTRACTS.md §6.4)
// ═══════════════════════════════════════════════════════════════

export const create = action({
  args: {
    payload: payloadValidator,
    turnstileToken: v.string(),
    idemKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ groupRequestId: string }> => {
    const { payload, turnstileToken, idemKey } = args;
    const now = Date.now();

    // 1. Validation partySize >= 16
    if (payload.partySize < MIN_GROUP_SIZE) {
      throw Errors.INVALID_INPUT("partySize", "Must be >= 16");
    }

    // 2. Validation format preferredDateKey
    if (!DATE_KEY_REGEX.test(payload.preferredDateKey)) {
      throw Errors.INVALID_INPUT("preferredDateKey", "Invalid format, expected YYYY-MM-DD");
    }

    // 3. Compute request hash for idempotency
    const requestHash = computeRequestHash(payload as Record<string, unknown>);

    // 4. Idempotence check (CONTRACTS.md §5.9)
    const idemCheck: { found: boolean; hashMismatch?: boolean; resultData?: unknown } = 
      await ctx.runQuery(internal.idempotency.check, {
        key: idemKey,
        requestHash,
      });

    if (idemCheck.found) {
      if (idemCheck.hashMismatch) {
        throw Errors.INVALID_INPUT("idemKey", "Request hash mismatch");
      }
      // Retourner résultat cached
      return idemCheck.resultData as { groupRequestId: string };
    }

    // 5. Récupérer settings pour Turnstile secret
    const settings: { restaurantId: string; turnstileSecretKey: string } | null = 
      await ctx.runMutation(internal.settings.getSecretsInternal, {});
    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    // 6. Vérifier Turnstile
    const turnstileOk = await verifyTurnstile(
      turnstileToken,
      settings.turnstileSecretKey
    );
    if (!turnstileOk) {
      throw Errors.TURNSTILE_FAILED();
    }

    // 7. Créer la demande
    const groupRequestId: string = await ctx.runMutation(internal.groupRequests._insert, {
      ...payload,
      restaurantId: settings.restaurantId as any,
      now,
    });

    // 8. Stocker idempotency key
    const result = { groupRequestId };
    await ctx.runMutation(internal.idempotency.store, {
      key: idemKey,
      action: "groupRequests.create" as const,
      requestHash,
      resultData: result,
      expiresAt: now + IDEMPOTENCY_TTL_MS,
    });

    // NOTE: Pas d'email selon contrat §6.4 :
    // "si kind=groupRequest => DEFAULT aucun email (le suivi est manuel)"

    return result;
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL MUTATION : _insert
// ═══════════════════════════════════════════════════════════════

export const _insert = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    partySize: v.number(),
    preferredDateKey: v.string(),
    preferredService: v.union(v.literal("lunch"), v.literal("dinner")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    language: v.union(
      v.literal("fr"),
      v.literal("nl"),
      v.literal("en"),
      v.literal("de"),
      v.literal("it"),
      v.literal("es")
    ),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const { now, ...data } = args;

    const groupRequestId = await ctx.db.insert("groupRequests", {
      restaurantId: data.restaurantId,
      partySize: data.partySize,
      preferredDateKey: data.preferredDateKey,
      preferredService: data.preferredService,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      message: data.message,
      language: data.language,
      status: "pending",
      reservationId: null,
      createdAt: now,
      updatedAt: now,
    });

    // Log without PII
    console.log("GroupRequest created", { groupRequestId, partySize: data.partySize });

    return groupRequestId;
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL QUERY : _getById
// ═══════════════════════════════════════════════════════════════

export const _getById = internalQuery({
  args: { id: v.id("groupRequests") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ═══════════════════════════════════════════════════════════════
// ADMIN QUERIES (RBAC admin|owner)
// ═══════════════════════════════════════════════════════════════

export const list = query({
  args: {
    status: v.optional(groupRequestStatusValidator),
  },
  handler: async (ctx, { status }) => {
    await requireRole(ctx, "admin");

    // Récupérer restaurant actif
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return { requests: [] };
    }

    let requests;
    if (status) {
      requests = await ctx.db
        .query("groupRequests")
        .withIndex("by_restaurant_status", (q) =>
          q.eq("restaurantId", restaurant._id).eq("status", status)
        )
        .order("desc")
        .take(100);
    } else {
      requests = await ctx.db
        .query("groupRequests")
        .withIndex("by_restaurant_status", (q) =>
          q.eq("restaurantId", restaurant._id)
        )
        .order("desc")
        .take(100);
    }

    return { requests };
  },
});

export const get = query({
  args: { requestId: v.id("groupRequests") },
  handler: async (ctx, { requestId }) => {
    await requireRole(ctx, "admin");

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw Errors.INVALID_INPUT("requestId", "Not found");
    }

    return request;
  },
});

// ═══════════════════════════════════════════════════════════════
// ADMIN MUTATION : updateStatus
// Transition + règle converted => reservationId obligatoire
// ═══════════════════════════════════════════════════════════════

export const updateStatus = mutation({
  args: {
    requestId: v.id("groupRequests"),
    status: groupRequestStatusValidator,
    reservationId: v.optional(v.id("reservations")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw Errors.INVALID_INPUT("requestId", "Not found");
    }

    // Valider transition
    if (!isValidTransition(request.status, args.status)) {
      throw Errors.INVALID_INPUT("status", "Invalid status transition");
    }

    // Règle : converted => reservationId obligatoire
    if (args.status === "converted" && !args.reservationId) {
      throw Errors.INVALID_INPUT("reservationId", "Required for converted status");
    }

    // Règle : si pas converted, reservationId interdit
    if (args.status !== "converted" && args.reservationId) {
      throw Errors.INVALID_INPUT("reservationId", "Only allowed for converted status");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: args.status,
      reservationId: args.reservationId ?? null,
      updatedAt: now,
    });

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function isValidTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    pending: ["contacted", "converted", "declined"],
    contacted: ["converted", "declined"],
    converted: [], // Terminal
    declined: [],  // Terminal
  };
  return transitions[from]?.includes(to) ?? false;
}

async function verifyTurnstile(
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      }
    );
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
