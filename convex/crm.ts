import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const CRM_VERSION = "v2.2";
const SCORE_VERSION = "v1";
const LEASE_DURATION_MS = 15 * 60 * 1000;

type LedgerOutcome =
  | "completed"
  | "completed_rehabilitated"
  | "noshow"
  | "cancelled"
  | "late_cancelled"
  | "departure_before_order";

const OUTCOME_POINTS: Record<LedgerOutcome, number> = {
  completed: 10,
  completed_rehabilitated: 10,
  noshow: -50,
  late_cancelled: -20,
  cancelled: 0,
  departure_before_order: 0,
};

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

function getHourInTimezone(date: Date, timezone: string): number {
  return parseInt(
    date.toLocaleString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    })
  );
}

function formatDateKey(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function addDaysDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMissingDates(lastSuccess: string | undefined, target: string, maxDays: number): string[] {
  const dates: string[] = [];
  let current = lastSuccess ? addDaysDateKey(lastSuccess, 1) : target;

  while (current <= target && dates.length < maxDays) {
    dates.push(current);
    current = addDaysDateKey(current, 1);
  }

  return dates;
}

async function getOrCreateClientId(ctx: any, reservation: any): Promise<string | null> {
  if (!reservation.phone) return null;

  const phone = normalizePhone(reservation.phone);
  const email = reservation.email ? normalizeEmail(reservation.email) : undefined;

  const existing = await ctx.db
    .query("clients")
    .withIndex("by_primaryPhone", (q: any) => q.eq("primaryPhone", phone))
    .unique();

  const now = Date.now();

  if (existing) {
    const patch: Record<string, unknown> = { lastUpdatedAt: now };

    if (reservation.firstName && !existing.firstName) patch.firstName = reservation.firstName;
    if (reservation.lastName && !existing.lastName) patch.lastName = reservation.lastName;

    if (email && !existing.email) patch.email = email;

    const mergedEmails = new Set([
      ...(existing.emails ?? []),
      ...(existing.email ? [existing.email] : []),
      ...(email ? [email] : []),
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
    emails: email ? [email] : [],
    searchText: buildSearchText({
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      email,
      primaryPhone: phone,
      phones: [],
      emails: email ? [email] : [],
    }),
    preferredLanguage: reservation.language,
    totalVisits: 0,
    totalNoShows: 0,
    totalRehabilitatedNoShows: 0,
    totalCancellations: 0,
    totalLateCancellations: 0,
    totalDeparturesBeforeOrder: 0,
    score: 0,
    scoreVersion: SCORE_VERSION,
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

async function finalizeWithCatchUp(ctx: any, timezone: string): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateKey = formatDateKey(yesterday, timezone);

  const lastSuccess = await ctx.db
    .query("crmDailyFinalizations")
    .withIndex("by_status", (q: any) => q.eq("status", "success"))
    .order("desc")
    .first();

  const missingDates = getMissingDates(lastSuccess?.dateKey, yesterdayDateKey, 7);

  for (const dateKey of missingDates) {
    await finalizeClientsForDate(ctx, dateKey);
  }
}

async function finalizeClientsForDate(ctx: any, dateKey: string): Promise<void> {
  const now = Date.now();

  const existing = await ctx.db
    .query("crmDailyFinalizations")
    .withIndex("by_dateKey", (q: any) => q.eq("dateKey", dateKey))
    .first();

  if (existing) {
    if (existing.status === "success") return;

    if (existing.status === "running" && existing.leaseExpiresAt > now) return;

    if (existing.status === "running" && existing.leaseExpiresAt <= now) {
      await ctx.db.patch(existing._id, {
        status: "running",
        leaseExpiresAt: now + LEASE_DURATION_MS,
        lockOwner: "crm",
        attempt: existing.attempt + 1,
        startedAt: now,
      });
    }

    if (existing.status === "failed") {
      await ctx.db.patch(existing._id, {
        status: "running",
        leaseExpiresAt: now + LEASE_DURATION_MS,
        lockOwner: "crm",
        attempt: existing.attempt + 1,
        startedAt: now,
        errorMessage: undefined,
      });
    }
  } else {
    await ctx.db.insert("crmDailyFinalizations", {
      dateKey,
      status: "running",
      leaseExpiresAt: now + LEASE_DURATION_MS,
      lockOwner: "crm",
      startedAt: now,
      processedReservations: 0,
      processedClients: 0,
      attempt: 1,
      version: CRM_VERSION,
    });
  }

  try {
    const stats = await processDateReservations(ctx, dateKey);

    const entry = await ctx.db
      .query("crmDailyFinalizations")
      .withIndex("by_dateKey", (q: any) => q.eq("dateKey", dateKey))
      .first();

    if (entry) {
      await ctx.db.patch(entry._id, {
        status: "success",
        finishedAt: Date.now(),
        processedReservations: stats.reservations,
        processedClients: stats.clients,
      });
    }
  } catch (error: any) {
    const entry = await ctx.db
      .query("crmDailyFinalizations")
      .withIndex("by_dateKey", (q: any) => q.eq("dateKey", dateKey))
      .first();

    if (entry) {
      await ctx.db.patch(entry._id, {
        status: "failed",
        finishedAt: Date.now(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }

    throw error;
  }
}

async function processDateReservations(ctx: any, dateKey: string): Promise<{ reservations: number; clients: number }> {
  const reservations = await ctx.db
    .query("reservations")
    .filter((q: any) => q.eq(q.field("dateKey"), dateKey))
    .collect();

  let processedReservations = 0;
  const touchedClients = new Set<string>();

  for (const r of reservations) {
    if (!r.phone) continue;

    const existingLedger = await ctx.db
      .query("clientLedger")
      .withIndex("by_reservationId", (q: any) => q.eq("reservationId", r._id))
      .unique();

    if (existingLedger) {
      continue;
    }

    const clientId = r.clientId ?? (await getOrCreateClientId(ctx, r));
    if (!clientId) continue;

    if (!r.clientId) {
      await ctx.db.patch(r._id, { clientId });
    }

    const status: string = r.status;

    let outcome: LedgerOutcome | null = null;

    if (status === "completed") {
      outcome = r.markedNoshowAt ? "completed_rehabilitated" : "completed";
    } else if (status === "noshow") {
      outcome = "noshow";
    } else if (status === "cancelled") {
      const cancelEvents = await ctx.db
        .query("reservationEvents")
        .withIndex("by_reservation", (q: any) => q.eq("reservationId", r._id))
        .collect();

      const isDepartureBeforeOrder = cancelEvents.some(
        (e: any) => e.eventType === "status_change" && e.fromStatus === "seated" && e.toStatus === "cancelled"
      );

      const isLateCancellation = cancelEvents.some(
        (e: any) =>
          e.eventType === "status_change" &&
          e.toStatus === "cancelled" &&
          (e.metadata?.isLateCancellation === true || e.metadata?.isLateCancellation === "true")
      );

      if (isDepartureBeforeOrder) {
        outcome = "departure_before_order";
      } else if (isLateCancellation) {
        outcome = "late_cancelled";
      } else {
        outcome = "cancelled";
      }
    }

    if (!outcome) continue;

    const createdAt = Date.now();
    const points = OUTCOME_POINTS[outcome];

    await ctx.db.insert("clientLedger", {
      dateKey,
      clientId,
      reservationId: r._id,
      outcome,
      points,
      createdAt,
    });

    touchedClients.add(clientId);
    processedReservations++;
  }

  for (const clientId of touchedClients) {
    const client = await ctx.db.get(clientId);
    if (!client) continue;

    if (client.needsRebuild) {
      continue;
    }

    // Get only the ledger entries created TODAY for this client (new entries from this run)
    const todayLedger = await ctx.db
      .query("clientLedger")
      .withIndex("by_clientId", (q: any) => q.eq("clientId", clientId))
      .filter((q: any) => q.eq(q.field("dateKey"), dateKey))
      .collect();

    // Start from existing client totals (preserve historical data)
    const totals = {
      totalVisits: client.totalVisits ?? 0,
      totalNoShows: client.totalNoShows ?? 0,
      totalRehabilitatedNoShows: client.totalRehabilitatedNoShows ?? 0,
      totalCancellations: client.totalCancellations ?? 0,
      totalLateCancellations: client.totalLateCancellations ?? 0,
      totalDeparturesBeforeOrder: client.totalDeparturesBeforeOrder ?? 0,
      lastVisitAt: client.lastVisitAt as number | undefined,
    };

    // Increment with today's new entries only
    for (const e of todayLedger) {
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

    await ctx.db.patch(clientId, {
      ...totals,
      score,
      scoreVersion: SCORE_VERSION,
      scoreBreakdown: breakdown,
      clientStatus,
      lastUpdatedAt: Date.now(),
    });
  }

  return { reservations: processedReservations, clients: touchedClients.size };
}

export const nightlyCheck = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
      .take(1);

    if (activeRestaurants.length === 0) {
      return { skipped: true, reason: "no_active_restaurant" };
    }

    const restaurant = activeRestaurants[0];
    const timezone = restaurant.timezone ?? "Europe/Brussels";

    const brusselsHour = getHourInTimezone(new Date(now), timezone);
    if (brusselsHour !== 4) {
      return { skipped: true, reason: `Hour is ${brusselsHour}, not 4`, timezone };
    }

    await finalizeWithCatchUp(ctx, timezone);

    return { ok: true };
  },
});

export const purgeOldClients = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeYearsAgo = now - 3 * 365 * 24 * 60 * 60 * 1000;

    const oldClients = await ctx.db
      .query("clients")
      .withIndex("by_lastVisitAt")
      .filter((q: any) => q.lt(q.field("lastVisitAt"), threeYearsAgo))
      .collect();

    for (const client of oldClients) {
      await ctx.db.patch(client._id, {
        firstName: "ANONYMISÉ",
        lastName: "ANONYMISÉ",
        email: undefined,
        primaryPhone: `ANON-${client._id}`,
        phones: [],
        emails: [],
        notes: [],
        searchText: "",
        deletedAt: now,
        deletionReason: "purge_3y",
        lastUpdatedAt: now,
      });

      const ledgerEntries = await ctx.db
        .query("clientLedger")
        .withIndex("by_clientId", (q: any) => q.eq("clientId", client._id))
        .collect();

      for (const entry of ledgerEntries) {
        await ctx.db.delete(entry._id);
      }
    }

    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const oldFinalizations = await ctx.db
      .query("crmDailyFinalizations")
      .filter((q: any) => q.lt(q.field("startedAt"), ninetyDaysAgo))
      .collect();

    for (const f of oldFinalizations) {
      await ctx.db.delete(f._id);
    }

    return { anonymizedClients: oldClients.length, deletedFinalizations: oldFinalizations.length };
  },
});

/**
 * Force finalization for a specific date (admin only).
 * Use this to manually trigger CRM processing for a past date.
 */
export const forceFinalize = internalMutation({
  args: { dateKey: v.string() },
  handler: async (ctx, { dateKey }) => {
    await finalizeClientsForDate(ctx, dateKey);
    return { ok: true, dateKey };
  },
});
