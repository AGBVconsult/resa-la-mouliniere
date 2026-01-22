import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { Errors } from "./lib/errors";
import { internal } from "./_generated/api";

/**
 * PRD-004: Floor Plan Module
 * 
 * Le plan de salle configuré (tables avec positions) est la BASE STATIQUE.
 * Chaque service (dateKey + service) a son propre état d'assignation.
 * 
 * Statuts table (par priorité):
 * - blocked: table désactivée (isActive=false)
 * - seated: au moins 1 résa assignée avec status="seated"
 * - reserved: au moins 1 résa assignée avec statut actif (pending/confirmed)
 * - free: aucune résa assignée
 */

type TableStatus = "seated" | "reserved" | "free" | "blocked";

// Statuts actifs pour le calcul
const ACTIVE_STATUSES = ["pending", "confirmed", "seated"] as const;
const PLANNING_STATUSES = ["pending", "confirmed"] as const;

/**
 * Calcule le statut d'une table pour un service donné.
 */
function computeTableStatus(
  table: Doc<"tables">,
  assignedReservations: Doc<"reservations">[]
): TableStatus {
  // 1. Override blocked
  if (!table.isActive) return "blocked";

  // 2. Check seated (réalité prime)
  const hasSeated = assignedReservations.some((r) => r.status === "seated");
  if (hasSeated) return "seated";

  // 3. Check reserved (planifié)
  const hasReserved = assignedReservations.some((r) =>
    PLANNING_STATUSES.includes(r.status as typeof PLANNING_STATUSES[number])
  );
  if (hasReserved) return "reserved";

  // 4. Default free
  return "free";
}

/**
 * Query: Retourne l'état de toutes les tables pour un service donné.
 * 
 * Chaque service (dateKey + service) a son propre "plan de salle"
 * basé sur les assignations des réservations.
 */
export const getTableStates = query({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
  },
  handler: async (ctx, { dateKey, service }) => {
    // 1. Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return { tables: [], reservations: [] };
    }

    // 2. Load all tables (active and inactive for display)
    const allTables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Filter to get only active tables, but keep inactive for blocked display
    const tables = allTables;

    // 3. Load all reservations for this service
    const allReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
      )
      .collect();

    // Filter to active statuses only
    const activeReservations = allReservations.filter((r) =>
      ACTIVE_STATUSES.includes(r.status as typeof ACTIVE_STATUSES[number])
    );

    // 4. Compute status for each table
    const tableStates = tables.map((table) => {
      // Find reservations assigned to this table
      const assignedReservations = activeReservations.filter((r) =>
        r.tableIds.includes(table._id)
      );

      const status = computeTableStatus(table, assignedReservations);

      // Get current/next reservation for display
      // Priority: seated > first by timeKey
      const seatedResa = assignedReservations.find((r) => r.status === "seated");
      const planningResas = assignedReservations
        .filter((r) => r.status !== "seated")
        .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
      const currentResa = seatedResa ?? planningResas[0];

      return {
        tableId: table._id,
        name: table.name,
        zone: table.zone,
        capacity: table.capacity,
        positionX: table.positionX ?? table.gridX ?? 0,
        positionY: table.positionY ?? table.gridY ?? 0,
        width: table.width ?? 1,
        height: table.height ?? 1,
        combinationDirection: table.combinationDirection ?? "none",
        isActive: table.isActive,
        status,
        // Current reservation info (if any)
        reservation: currentResa
          ? {
              id: currentResa._id,
              firstName: currentResa.firstName,
              lastName: currentResa.lastName,
              partySize: currentResa.partySize,
              timeKey: currentResa.timeKey,
              status: currentResa.status,
              version: currentResa.version,
            }
          : null,
        // All reservations assigned to this table for this service
        reservationCount: assignedReservations.length,
      };
    });

    // 5. Return unassigned reservations too (for assignment UI)
    const unassignedReservations = activeReservations
      .filter((r) => r.tableIds.length === 0)
      .map((r) => ({
        id: r._id,
        firstName: r.firstName,
        lastName: r.lastName,
        partySize: r.partySize,
        timeKey: r.timeKey,
        status: r.status,
        version: r.version,
        note: r.note,
        options: r.options,
      }));

    return {
      tables: tableStates,
      unassignedReservations,
      dateKey,
      service,
    };
  },
});

/**
 * Mutation: Assigne une réservation à une ou plusieurs tables.
 * 
 * Vérifie:
 * - La réservation existe et est dans un statut assignable
 * - Les tables existent et sont actives
 * - La capacité totale est suffisante
 * - Pas de conflit avec d'autres réservations (même table, même service)
 */
export const assign = mutation({
  args: {
    reservationId: v.id("reservations"),
    tableIds: v.array(v.id("tables")),
    primaryTableId: v.optional(v.id("tables")), // Table cliquée par l'utilisateur
    expectedVersion: v.number(),
  },
  handler: async (ctx, { reservationId, tableIds, primaryTableId, expectedVersion }) => {
    // 1. Load reservation
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw Errors.RESERVATION_NOT_FOUND(reservationId);
    }

    // 2. Check version (optimistic locking)
    if (reservation.version !== expectedVersion) {
      throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
    }

    // 3. Check reservation status is assignable
    const ASSIGNABLE_STATUSES = ["pending", "confirmed", "seated"];
    if (!ASSIGNABLE_STATUSES.includes(reservation.status)) {
      throw Errors.INVALID_STATUS(reservation.status);
    }

    // 4. Load tables
    const tables = await Promise.all(tableIds.map((id) => ctx.db.get(id)));

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (!table) {
        throw Errors.TABLE_NOT_FOUND(tableIds[i]);
      }
      if (!table.isActive) {
        throw Errors.TABLE_BLOCKED(table.name);
      }
    }

    // 5. Check total capacity
    const totalCapacity = tables.reduce((sum, t) => sum + (t?.capacity ?? 0), 0);
    if (totalCapacity < reservation.partySize) {
      throw Errors.INSUFFICIENT_TABLE_CAPACITY(totalCapacity, reservation.partySize);
    }

    // 6. Check for conflicts (other reservations on same tables, same service)
    const allReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q
          .eq("restaurantId", reservation.restaurantId)
          .eq("dateKey", reservation.dateKey)
          .eq("service", reservation.service)
      )
      .collect();

    // Filter to active reservations (excluding current one)
    const otherActiveReservations = allReservations.filter(
      (r) =>
        r._id !== reservationId &&
        ACTIVE_STATUSES.includes(r.status as typeof ACTIVE_STATUSES[number])
    );

    // Check each table for conflicts
    for (const tableId of tableIds) {
      const table = tables.find((t) => t?._id === tableId);
      const conflictingResas = otherActiveReservations.filter((r) =>
        r.tableIds.includes(tableId)
      );

      for (const conflict of conflictingResas) {
        // If conflict is seated, special message
        if (conflict.status === "seated") {
          throw Errors.TABLE_OCCUPIED(table?.name ?? "Unknown", `${conflict.firstName} ${conflict.lastName}`);
        }
        // Otherwise, table is already reserved
        throw Errors.TABLE_OCCUPIED(table?.name ?? "Unknown", `${conflict.firstName} ${conflict.lastName}`);
      }
    }

    // 7. Apply assignment
    const now = Date.now();
    const newVersion = reservation.version + 1;

    await ctx.db.patch(reservationId, {
      tableIds,
      primaryTableId: primaryTableId ?? tableIds[0], // Fallback to first table if not specified
      version: newVersion,
      updatedAt: now,
    });

    // 8. Log event
    await ctx.db.insert("reservationEvents", {
      reservationId,
      restaurantId: reservation.restaurantId,
      eventType: "table_assignment",
      actualTime: now,
      metadata: {
        tableIds,
        tableNames: tables.map((t) => t?.name),
        mode: tableIds.length > 1 ? "multi" : "single",
      },
      createdAt: now,
    });

    // 9. Log assignment for shadow learning (PRD-011)
    const userId = (await ctx.auth.getUserIdentity())?.subject ?? "system";
    await ctx.scheduler.runAfter(0, internal.assignmentLogs.logAssignment, {
      restaurantId: reservation.restaurantId,
      reservationId,
      reservationVersion: newVersion,
      dateKey: reservation.dateKey,
      timeKey: reservation.timeKey,
      service: reservation.service,
      partySize: reservation.partySize,
      childrenCount: reservation.childrenCount,
      babiesCount: reservation.babyCount,
      assignedTableIds: tableIds,
      assignedBy: userId,
      assignmentMethod: "manual_click",
    });

    return {
      success: true,
      tableIds,
      newVersion,
    };
  },
});

/**
 * Mutation: Retire l'assignation de tables d'une réservation.
 */
export const unassign = mutation({
  args: {
    reservationId: v.id("reservations"),
    expectedVersion: v.number(),
  },
  handler: async (ctx, { reservationId, expectedVersion }) => {
    // 1. Load reservation
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw Errors.RESERVATION_NOT_FOUND(reservationId);
    }

    // 2. Check version
    if (reservation.version !== expectedVersion) {
      throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
    }

    const previousTableIds = reservation.tableIds;
    const now = Date.now();
    const newVersion = reservation.version + 1;

    // 3. Remove assignment
    await ctx.db.patch(reservationId, {
      tableIds: [],
      version: newVersion,
      updatedAt: now,
    });

    // 4. Log event
    await ctx.db.insert("reservationEvents", {
      reservationId,
      restaurantId: reservation.restaurantId,
      eventType: "table_assignment",
      actualTime: now,
      metadata: {
        previousTableIds,
        action: "unassign",
      },
      createdAt: now,
    });

    console.log("Table unassigned", {
      reservationId,
      previousTableIds,
      newVersion,
    });

    return {
      success: true,
      newVersion,
    };
  },
});

/**
 * Query: Vérifie si une assignation est possible avant de l'effectuer.
 * Utile pour l'UI (preview avant confirmation).
 */
export const checkAssignment = query({
  args: {
    reservationId: v.id("reservations"),
    tableIds: v.array(v.id("tables")),
  },
  handler: async (ctx, { reservationId, tableIds }) => {
    // Load reservation
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      return { valid: false, error: "RESERVATION_NOT_FOUND" };
    }

    // Check status
    const ASSIGNABLE_STATUSES = ["pending", "confirmed", "seated"];
    if (!ASSIGNABLE_STATUSES.includes(reservation.status)) {
      return { valid: false, error: `INVALID_STATUS|${reservation.status}` };
    }

    // Load tables
    const tables = await Promise.all(tableIds.map((id) => ctx.db.get(id)));

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (!table) {
        return { valid: false, error: `TABLE_NOT_FOUND|${tableIds[i]}` };
      }
      if (!table.isActive) {
        return { valid: false, error: `TABLE_BLOCKED|${table.name}` };
      }
    }

    // Check capacity
    const totalCapacity = tables.reduce((sum, t) => sum + (t?.capacity ?? 0), 0);
    if (totalCapacity < reservation.partySize) {
      return {
        valid: false,
        error: `INSUFFICIENT_CAPACITY|${totalCapacity}|${reservation.partySize}`,
      };
    }

    // Check conflicts
    const allReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q
          .eq("restaurantId", reservation.restaurantId)
          .eq("dateKey", reservation.dateKey)
          .eq("service", reservation.service)
      )
      .collect();

    const otherActiveReservations = allReservations.filter(
      (r) =>
        r._id !== reservationId &&
        ACTIVE_STATUSES.includes(r.status as typeof ACTIVE_STATUSES[number])
    );

    for (const tableId of tableIds) {
      const table = tables.find((t) => t?._id === tableId);
      const conflictingResas = otherActiveReservations.filter((r) =>
        r.tableIds.includes(tableId)
      );

      if (conflictingResas.length > 0) {
        const conflict = conflictingResas[0];
        if (conflict.status === "seated") {
          return {
            valid: false,
            error: `TABLE_OCCUPIED_SEATED|${table?.name}|${conflict.firstName} ${conflict.lastName}`,
          };
        }
        return {
          valid: false,
          error: `TABLE_CONFLICT|${table?.name}|${conflict.firstName} ${conflict.lastName}|${conflict.timeKey}`,
        };
      }
    }

    return {
      valid: true,
      totalCapacity,
      partySize: reservation.partySize,
      tableNames: tables.map((t) => t?.name),
    };
  },
});
