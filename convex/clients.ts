import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";

const SCORE_VERSION = "v1";

function computeScore(client: {
  totalVisits: number;
  totalNoShows: number;
  totalLateCancellations: number;
}): { score: number; breakdown: { visits: number; noshows: number; lateCancels: number } } {
  const breakdown = {
    visits: client.totalVisits * 10,
    noshows: client.totalNoShows * -50,
    lateCancels: client.totalLateCancellations * -20,
  };
  const score = breakdown.visits + breakdown.noshows + breakdown.lateCancels;
  return { score, breakdown };
}

function computeClientStatus(client: {
  totalVisits: number;
  totalNoShows: number;
  isBlacklisted?: boolean;
}): "new" | "regular" | "vip" | "bad_guest" {
  if (client.isBlacklisted) return "bad_guest";
  if (client.totalNoShows >= 2) return "bad_guest";
  if (client.totalVisits >= 5 && client.totalNoShows === 0) return "vip";
  if (client.totalVisits >= 3) return "regular";
  return "new";
}

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

function maskPhoneForStaff(phone: string): string {
  if (phone.length < 8) return phone;
  const visible = phone.slice(0, -6);
  return `${visible}** ***`;
}

function makeNoteId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function logCrmAction(
  ctx: { auth: { getUserIdentity: () => Promise<any> } },
  action: string,
  clientId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.subject ?? "unknown";
  console.log("[CRM AUDIT]", { action, clientId, userId, metadata: metadata ?? null });
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("regular"),
      v.literal("vip"),
      v.literal("bad_guest")
    )),
    needsRebuild: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const role = await requireRole(ctx, "staff");

    let q = ctx.db.query("clients");

    if (!args.includeDeleted) {
      q = q.filter((f) => f.eq(f.field("deletedAt"), undefined));
    }

    if (args.status) {
      q = q.filter((f) => f.eq(f.field("clientStatus"), args.status));
    }

    if (args.needsRebuild !== undefined) {
      q = q.filter((f) => f.eq(f.field("needsRebuild"), args.needsRebuild));
    }

    const paginated = await q.order("desc").paginate(args.paginationOpts);

    const page = paginated.page.map((client) => {
      if (role === "staff") {
        return {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: maskPhoneForStaff(client.primaryPhone),
          clientStatus: client.clientStatus,
          totalVisits: client.totalVisits,
          lastVisitAt: client.lastVisitAt,
          preferredLanguage: client.preferredLanguage,
          needsRebuild: client.needsRebuild,
          score: client.score,
        };
      }
      return client;
    });

    return {
      page,
      continueCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
  },
});

export const get = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const role = await requireRole(ctx, "staff");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw Errors.NOT_FOUND("clients", args.clientId);

    // Get reservations for this client
    const reservations = await ctx.db
      .query("reservations")
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .order("desc")
      .take(50);

    const reservationsWithTables = await Promise.all(
      reservations.map(async (r) => {
        const tables = await Promise.all(
          r.tableIds.map((tid) => ctx.db.get(tid))
        );
        return {
          ...r,
          tableNames: tables.filter(Boolean).map((t) => t!.name),
        };
      })
    );

    if (role === "staff") {
      return {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: maskPhoneForStaff(client.primaryPhone),
        clientStatus: client.clientStatus,
        totalVisits: client.totalVisits,
        totalNoShows: client.totalNoShows,
        totalLateCancellations: client.totalLateCancellations,
        totalCancellations: client.totalCancellations,
        totalRehabilitatedNoShows: client.totalRehabilitatedNoShows,
        totalDeparturesBeforeOrder: client.totalDeparturesBeforeOrder,
        score: client.score,
        scoreVersion: client.scoreVersion,
        scoreBreakdown: client.scoreBreakdown,
        lastVisitAt: client.lastVisitAt,
        preferredLanguage: client.preferredLanguage,
        needsRebuild: client.needsRebuild,
        dietaryRestrictions: client.dietaryRestrictions,
        tags: client.tags,
        notes: client.notes,
        preferredZone: client.preferredZone,
        preferredTable: client.preferredTable,
        firstSeenAt: client.firstSeenAt,
        isBlacklisted: client.isBlacklisted,
        reservations: reservationsWithTables,
      };
    }

    return { ...client, reservations: reservationsWithTables };
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const role = await requireRole(ctx, "staff");
    const phone = normalizePhone(args.phone);
    const client = await ctx.db
      .query("clients")
      .withIndex("by_primaryPhone", (q) => q.eq("primaryPhone", phone))
      .unique();

    if (!client) return null;

    if (role === "staff") {
      return {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: maskPhoneForStaff(client.primaryPhone),
        clientStatus: client.clientStatus,
        totalVisits: client.totalVisits,
        lastVisitAt: client.lastVisitAt,
        preferredLanguage: client.preferredLanguage,
        needsRebuild: client.needsRebuild,
        score: client.score,
      };
    }

    return client;
  },
});

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("regular"),
      v.literal("vip"),
      v.literal("bad_guest")
    )),
  },
  handler: async (ctx, args) => {
    const role = await requireRole(ctx, "staff");

    const q = normalize(args.query);

    let searchQuery = ctx.db
      .query("clients")
      .withSearchIndex("search_client", (q2) => q2.search("searchText", q));

    if (args.status) {
      searchQuery = searchQuery.filter((f) => f.eq(f.field("clientStatus"), args.status));
    }

    searchQuery = searchQuery.filter((f) => f.eq(f.field("deletedAt"), undefined));

    const results = await searchQuery.take(args.limit ?? 20);

    return results.map((client) => {
      if (role === "staff") {
        return {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: maskPhoneForStaff(client.primaryPhone),
          clientStatus: client.clientStatus,
          totalVisits: client.totalVisits,
          lastVisitAt: client.lastVisitAt,
          preferredLanguage: client.preferredLanguage,
          needsRebuild: client.needsRebuild,
          score: client.score,
        };
      }
      return client;
    });
  },
});

export const getOrCreate = mutation({
  args: {
    phone: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    preferredLanguage: v.optional(v.union(
      v.literal("fr"),
      v.literal("nl"),
      v.literal("en"),
      v.literal("de"),
      v.literal("it")
    )),
    acquisitionSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const now = Date.now();
    const phone = normalizePhone(args.phone);
    const email = args.email ? normalizeEmail(args.email) : undefined;

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_primaryPhone", (q) => q.eq("primaryPhone", phone))
      .unique();

    if (existing) {
      const patch: Record<string, unknown> = {
        lastUpdatedAt: now,
      };

      if (args.firstName && !existing.firstName) patch.firstName = args.firstName;
      if (args.lastName && !existing.lastName) patch.lastName = args.lastName;

      if (email && !existing.email) {
        patch.email = email;
      }

      const mergedEmails = new Set([...(existing.emails ?? []), ...(existing.email ? [existing.email] : []), ...(email ? [email] : [])]);
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
      return { clientId: existing._id };
    }

    const clientId = await ctx.db.insert("clients", {
      primaryPhone: phone,
      phones: [],
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      emails: email ? [email] : [],
      searchText: buildSearchText({
        firstName: args.firstName,
        lastName: args.lastName,
        email,
        primaryPhone: phone,
        phones: [],
        emails: email ? [email] : [],
      }),
      preferredLanguage: args.preferredLanguage,
      totalVisits: 0,
      totalNoShows: 0,
      totalRehabilitatedNoShows: 0,
      totalCancellations: 0,
      totalLateCancellations: 0,
      totalDeparturesBeforeOrder: 0,
      score: 0,
      scoreVersion: "v1",
      scoreBreakdown: { visits: 0, noshows: 0, lateCancels: 0 },
      clientStatus: "new",
      isBlacklisted: false,
      needsRebuild: false,
      dietaryRestrictions: [],
      tags: [],
      notes: [],
      marketingConsent: undefined,
      marketingConsentAt: undefined,
      marketingConsentSource: undefined,
      acquisitionSource: args.acquisitionSource,
      deletedAt: undefined,
      deletedBy: undefined,
      deletionReason: undefined,
      firstSeenAt: now,
      lastVisitAt: undefined,
      lastUpdatedAt: now,
    });

    return { clientId };
  },
});

export const update = mutation({
  args: {
    clientId: v.id("clients"),
    patch: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      primaryPhone: v.optional(v.string()),
      preferredLanguage: v.optional(v.union(
        v.literal("fr"),
        v.literal("nl"),
        v.literal("en"),
        v.literal("de"),
        v.literal("it")
      )),
      dietaryRestrictions: v.optional(v.array(v.string())),
      preferredZone: v.optional(v.string()),
      preferredTable: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      isBlacklisted: v.optional(v.boolean()),
      isLateClient: v.optional(v.boolean()),
      isSlowClient: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw Errors.NOT_FOUND("clients", args.clientId);

    const now = Date.now();

    const primaryPhone = args.patch.primaryPhone
      ? normalizePhone(args.patch.primaryPhone)
      : client.primaryPhone;

    const email = args.patch.email !== undefined ? normalizeEmail(args.patch.email) : client.email;

    const next = {
      ...client,
      ...args.patch,
      primaryPhone,
      email,
      lastUpdatedAt: now,
    };

    await ctx.db.patch(args.clientId, {
      ...args.patch,
      primaryPhone,
      email,
      searchText: buildSearchText({
        firstName: next.firstName,
        lastName: next.lastName,
        email: next.email,
        primaryPhone: next.primaryPhone,
        phones: next.phones,
        emails: next.emails,
      }),
      lastUpdatedAt: now,
    });

    return { ok: true };
  },
});

export { deleteClient as delete };

export const exportClientData = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw Errors.NOT_FOUND("clients", args.clientId);

    const ledger = await ctx.db
      .query("clientLedger")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    const { searchText, ...clientData } = client as any;

    return {
      exportedAt: new Date().toISOString(),
      client: clientData,
      history: ledger,
    };
  },
});

export { exportClientData as export };

export const rebuildStats = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw Errors.NOT_FOUND("clients", args.clientId);

    // Get ledger entries for score calculation
    const ledger = await ctx.db
      .query("clientLedger")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    // Get all reservations for this client
    const reservations = await ctx.db
      .query("reservations")
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .collect();

    const totals = {
      totalVisits: 0,
      totalNoShows: 0,
      totalRehabilitatedNoShows: 0,
      totalCancellations: 0,
      totalLateCancellations: 0,
      totalDeparturesBeforeOrder: 0,
      lastVisitAt: undefined as number | undefined,
    };

    for (const e of ledger) {
      if (e.outcome === "completed") {
        totals.totalVisits++;
        if (!totals.lastVisitAt || e.createdAt > totals.lastVisitAt) totals.lastVisitAt = e.createdAt;
      }
      if (e.outcome === "completed_rehabilitated") {
        totals.totalVisits++;
        totals.totalRehabilitatedNoShows++;
        if (!totals.lastVisitAt || e.createdAt > totals.lastVisitAt) totals.lastVisitAt = e.createdAt;
      }
      if (e.outcome === "noshow") totals.totalNoShows++;
      if (e.outcome === "cancelled") totals.totalCancellations++;
      if (e.outcome === "late_cancelled") totals.totalLateCancellations++;
      if (e.outcome === "departure_before_order") totals.totalDeparturesBeforeOrder++;
    }

    // Calculate aggregated reservation stats
    const totalReservations = reservations.length;

    // Find last completed reservation for lastTableId and lastVisitAt
    const completedReservations = reservations
      .filter((r) => r.status === "completed" && r.completedAt)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    const lastCompletedReservation = completedReservations[0];
    const lastTableId = lastCompletedReservation?.primaryTableId ?? lastCompletedReservation?.tableIds?.[0];

    // Calculate preferred table (most frequent)
    const tableFrequency: Record<string, number> = {};
    for (const r of completedReservations) {
      const tableId = r.primaryTableId ?? r.tableIds?.[0];
      if (tableId) {
        tableFrequency[tableId] = (tableFrequency[tableId] || 0) + 1;
      }
    }
    let preferredTableId: string | undefined;
    let maxFreq = 0;
    for (const [tableId, freq] of Object.entries(tableFrequency)) {
      if (freq > maxFreq) {
        maxFreq = freq;
        preferredTableId = tableId;
      }
    }

    // Calculate preferred service (most frequent)
    const serviceFrequency: Record<string, number> = { lunch: 0, dinner: 0 };
    for (const r of completedReservations) {
      if (r.service === "lunch" || r.service === "dinner") {
        serviceFrequency[r.service]++;
      }
    }
    const preferredService = serviceFrequency.lunch >= serviceFrequency.dinner ? "lunch" : "dinner";

    // Calculate average party size
    let totalPartySize = 0;
    for (const r of completedReservations) {
      totalPartySize += r.partySize;
    }
    const avgPartySize = completedReservations.length > 0
      ? Math.round((totalPartySize / completedReservations.length) * 10) / 10
      : undefined;

    // Calculate average meal duration (completedAt - seatedAt)
    let totalDuration = 0;
    let durationCount = 0;
    for (const r of completedReservations) {
      if (r.seatedAt && r.completedAt) {
        const durationMs = r.completedAt - r.seatedAt;
        if (durationMs > 0 && durationMs < 8 * 60 * 60 * 1000) { // Max 8 hours
          totalDuration += durationMs;
          durationCount++;
        }
      }
    }
    const avgMealDurationMinutes = durationCount > 0
      ? Math.round(totalDuration / durationCount / 60000)
      : undefined;

    // Calculate average delay from reservation events
    const reservationIds = new Set(completedReservations.map((r) => r._id));
    let totalDelay = 0;
    let delayCount = 0;
    for (const resId of reservationIds) {
      const events = await ctx.db
        .query("reservationEvents")
        .withIndex("by_reservation", (q) => q.eq("reservationId", resId))
        .collect();
      for (const e of events) {
        if (e.eventType === "status_change" && e.toStatus === "seated" && typeof e.delayMinutes === "number") {
          totalDelay += e.delayMinutes;
          delayCount++;
        }
      }
    }
    const avgDelayMinutes = delayCount > 0
      ? Math.round((totalDelay / delayCount) * 10) / 10
      : undefined;

    const { score, breakdown } = computeScore({
      totalVisits: totals.totalVisits,
      totalNoShows: totals.totalNoShows,
      totalLateCancellations: totals.totalLateCancellations,
    });

    const clientStatus = computeClientStatus({
      totalVisits: totals.totalVisits,
      totalNoShows: totals.totalNoShows,
      isBlacklisted: client.isBlacklisted,
    });

    await ctx.db.patch(args.clientId, {
      ...totals,
      score,
      scoreVersion: SCORE_VERSION,
      scoreBreakdown: breakdown,
      clientStatus,
      needsRebuild: false,
      needsRebuildReason: undefined,
      needsRebuildAt: undefined,
      lastUpdatedAt: Date.now(),
      // New aggregated fields
      totalReservations,
      lastTableId: lastTableId as any,
      preferredTableId: preferredTableId as any,
      preferredService: completedReservations.length > 0 ? preferredService : undefined,
      avgPartySize,
      avgMealDurationMinutes,
      avgDelayMinutes,
    });

    await logCrmAction(ctx, "rebuild_stats", args.clientId);

    return { success: true, newScore: score, newStatus: clientStatus };
  },
});

export const merge = mutation({
  args: {
    targetClientId: v.id("clients"),
    sourceClientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    if (args.targetClientId === args.sourceClientId) {
      throw Errors.INVALID_INPUT("sourceClientId", "Doit être différent de targetClientId");
    }

    const target = await ctx.db.get(args.targetClientId);
    const source = await ctx.db.get(args.sourceClientId);
    if (!target) throw Errors.NOT_FOUND("clients", args.targetClientId);
    if (!source) throw Errors.NOT_FOUND("clients", args.sourceClientId);

    const mergedPhones = new Set([
      target.primaryPhone,
      ...(target.phones ?? []),
      source.primaryPhone,
      ...(source.phones ?? []),
    ]);
    const mergedEmails = new Set([
      ...(target.emails ?? []),
      ...(target.email ? [target.email] : []),
      ...(source.emails ?? []),
      ...(source.email ? [source.email] : []),
    ]);

    const now = Date.now();

    await ctx.db.patch(args.targetClientId, {
      firstName: target.firstName ?? source.firstName,
      lastName: target.lastName ?? source.lastName,
      email: target.email ?? source.email,
      emails: Array.from(mergedEmails),
      phones: Array.from(mergedPhones).filter((p) => p !== target.primaryPhone),
      needsRebuild: true,
      needsRebuildReason: "manual_merge",
      needsRebuildAt: now,
      lastUpdatedAt: now,
      searchText: buildSearchText({
        firstName: target.firstName ?? source.firstName,
        lastName: target.lastName ?? source.lastName,
        email: target.email ?? source.email,
        primaryPhone: target.primaryPhone,
        phones: Array.from(mergedPhones).filter((p) => p !== target.primaryPhone),
        emails: Array.from(mergedEmails),
      }),
    });

    const sourceReservations = await ctx.db
      .query("reservations")
      .filter((q) => q.eq(q.field("clientId"), args.sourceClientId))
      .collect();
    for (const r of sourceReservations) {
      await ctx.db.patch(r._id, { clientId: args.targetClientId });
    }

    const sourceLedger = await ctx.db
      .query("clientLedger")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.sourceClientId))
      .collect();
    for (const e of sourceLedger) {
      await ctx.db.patch(e._id, { clientId: args.targetClientId });
    }

    await ctx.db.patch(args.sourceClientId, {
      deletedAt: now,
      deletionReason: "merged",
      deletedBy: (await ctx.auth.getUserIdentity())?.subject ?? "unknown",
      lastUpdatedAt: now,
    });

    await logCrmAction(ctx, "merge", args.targetClientId, { sourceClientId: args.sourceClientId });

    return { ok: true };
  },
});

export const addNote = mutation({
  args: {
    clientId: v.id("clients"),
    content: v.string(),
    type: v.union(
      v.literal("preference"),
      v.literal("incident"),
      v.literal("info"),
      v.literal("alert")
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw Errors.NOT_FOUND("clients", args.clientId);

    const identity = await ctx.auth.getUserIdentity();
    const author = identity?.subject ?? "unknown";

    const now = Date.now();

    const content = args.content.trim();
    if (content.length === 0) {
      throw Errors.INVALID_INPUT("content", "La note ne peut pas être vide");
    }
    if (content.length > 1000) {
      throw Errors.INVALID_INPUT("content", "La note ne peut pas dépasser 1000 caractères");
    }

    const notes = [...(client.notes ?? [])];
    notes.push({
      id: makeNoteId(),
      content,
      type: args.type,
      author,
      createdAt: now,
    });

    const trimmed = notes.slice(-50);

    await ctx.db.patch(args.clientId, {
      notes: trimmed,
      notesUpdatedAt: now,
      lastUpdatedAt: now,
    });

    await logCrmAction(ctx, "add_note", args.clientId, { type: args.type });

    return { ok: true };
  },
});

export const deleteNote = mutation({
  args: {
    clientId: v.id("clients"),
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw Errors.NOT_FOUND("clients", args.clientId);

    const now = Date.now();

    const nextNotes = (client.notes ?? []).filter((n) => n.id !== args.noteId);

    await ctx.db.patch(args.clientId, {
      notes: nextNotes,
      notesUpdatedAt: now,
      lastUpdatedAt: now,
    });

    await logCrmAction(ctx, "delete_note", args.clientId, { noteId: args.noteId });

    return { ok: true };
  },
});

export const deleteClient = mutation({
  args: {
    clientId: v.id("clients"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "unknown";

    await ctx.db.patch(args.clientId, {
      deletedAt: Date.now(),
      deletedBy: userId,
      deletionReason: args.reason,
    });

    await logCrmAction(ctx, "soft_delete", args.clientId, { reason: args.reason });

    return { ok: true };
  },
});

/**
 * Import clients from CSV data.
 * Expected columns: Prénom, Nom, Téléphone_International, email, Réservations
 * Upserts by phone number (primary key).
 */
export const importFromCSV = mutation({
  args: {
    rows: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        phone: v.string(),
        email: v.string(),
        totalVisits: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const now = Date.now();
    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];

      try {
        if (!row.phone || row.phone.trim().length < 5) {
          errors.push({ row: i + 1, error: "Téléphone invalide ou manquant" });
          continue;
        }

        const phone = normalizePhone(row.phone);
        const email = row.email ? normalizeEmail(row.email) : "";
        const firstName = row.firstName?.trim() ?? "";
        const lastName = row.lastName?.trim() ?? "";
        const totalVisits = Math.max(0, Math.floor(row.totalVisits || 0));

        const existing = await ctx.db
          .query("clients")
          .withIndex("by_primaryPhone", (q) => q.eq("primaryPhone", phone))
          .unique();

        if (existing) {
          // Update existing client
          const mergedEmails = new Set([
            ...(existing.emails ?? []),
            ...(existing.email ? [existing.email] : []),
            ...(email ? [email] : []),
          ]);

          const newTotalVisits = Math.max(existing.totalVisits, totalVisits);
          const { score, breakdown } = computeScore({
            totalVisits: newTotalVisits,
            totalNoShows: existing.totalNoShows,
            totalLateCancellations: existing.totalLateCancellations,
          });
          const clientStatus = computeClientStatus({
            totalVisits: newTotalVisits,
            totalNoShows: existing.totalNoShows,
            isBlacklisted: existing.isBlacklisted,
          });

          await ctx.db.patch(existing._id, {
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            email: email || existing.email,
            emails: Array.from(mergedEmails),
            totalVisits: newTotalVisits,
            score,
            scoreBreakdown: breakdown,
            clientStatus,
            searchText: buildSearchText({
              firstName: firstName || existing.firstName,
              lastName: lastName || existing.lastName,
              email: email || existing.email,
              primaryPhone: phone,
              phones: existing.phones,
              emails: Array.from(mergedEmails),
            }),
            lastUpdatedAt: now,
          });
          updated++;
        } else {
          // Create new client
          const { score, breakdown } = computeScore({
            totalVisits,
            totalNoShows: 0,
            totalLateCancellations: 0,
          });
          const clientStatus = computeClientStatus({
            totalVisits,
            totalNoShows: 0,
            isBlacklisted: false,
          });

          await ctx.db.insert("clients", {
            primaryPhone: phone,
            phones: [],
            firstName,
            lastName,
            email,
            emails: email ? [email] : [],
            searchText: buildSearchText({
              firstName,
              lastName,
              email,
              primaryPhone: phone,
              phones: [],
              emails: email ? [email] : [],
            }),
            totalVisits,
            totalNoShows: 0,
            totalRehabilitatedNoShows: 0,
            totalCancellations: 0,
            totalLateCancellations: 0,
            totalDeparturesBeforeOrder: 0,
            score,
            scoreVersion: SCORE_VERSION,
            scoreBreakdown: breakdown,
            clientStatus,
            isBlacklisted: false,
            needsRebuild: false,
            dietaryRestrictions: [],
            tags: [],
            notes: [],
            acquisitionSource: "csv_import",
            firstSeenAt: now,
            lastUpdatedAt: now,
          });
          created++;
        }
      } catch (e) {
        errors.push({ row: i + 1, error: String(e) });
      }
    }

    await logCrmAction(ctx, "csv_import", "bulk_import", { created, updated, errors: errors.length });

    return { created, updated, errors };
  },
});
