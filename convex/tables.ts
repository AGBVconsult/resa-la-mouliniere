/**
 * Tables management (PRD-004 - Plan de salle)
 * CRUD operations for restaurant tables with combination support
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";
import type { Id } from "./_generated/dataModel";

// Constants
const TABLE_GRID_SPAN = 3; // Cellules par table

// Helper to get position with fallback (for migration from gridX/gridY)
function getPosition(table: { positionX?: number; positionY?: number; gridX?: number; gridY?: number }) {
  return {
    x: table.positionX ?? (table.gridX ?? 0) * TABLE_GRID_SPAN,
    y: table.positionY ?? (table.gridY ?? 0) * TABLE_GRID_SPAN,
  };
}


// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * List all tables for the active restaurant
 */
export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    zone: v.optional(v.union(v.literal("salle"), v.literal("terrasse"))),
  },
  handler: async (ctx, { activeOnly = false, zone }) => {
    await requireRole(ctx, "admin");

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return [];
    }

    let tables;
    if (zone) {
      tables = await ctx.db
        .query("tables")
        .withIndex("by_restaurant_zone", (q) =>
          q.eq("restaurantId", restaurant._id).eq("zone", zone)
        )
        .collect();
    } else {
      tables = await ctx.db
        .query("tables")
        .withIndex("by_restaurant_isActive", (q) =>
          q.eq("restaurantId", restaurant._id)
        )
        .collect();
    }

    if (activeOnly) {
      tables = tables.filter((t) => t.isActive);
    }

    return tables.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
  },
});

/**
 * Get statistics about tables
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return {
        total: 0,
        active: 0,
        salle: { count: 0, capacity: 0 },
        terrasse: { count: 0, capacity: 0 },
        totalCapacity: 0,
      };
    }

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    const activeTables = tables.filter((t) => t.isActive);
    const salleTables = activeTables.filter((t) => t.zone === "salle");
    const terrasseTables = activeTables.filter((t) => t.zone === "terrasse");

    return {
      total: tables.length,
      active: activeTables.length,
      salle: {
        count: salleTables.length,
        capacity: salleTables.reduce((sum, t) => sum + t.capacity, 0),
      },
      terrasse: {
        count: terrasseTables.length,
        capacity: terrasseTables.reduce((sum, t) => sum + t.capacity, 0),
      },
      totalCapacity: activeTables.reduce((sum, t) => sum + t.capacity, 0),
    };
  },
});

/**
 * Get table states for a specific service (which tables are assigned)
 */
export const getTableStates = query({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
  },
  handler: async (ctx, { dateKey, service }) => {
    await requireRole(ctx, "admin");

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return { tables: [], assignedTableIds: [] };
    }

    // Get all tables
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) =>
        q.eq("restaurantId", restaurant._id).eq("isActive", true)
      )
      .collect();

    // Get reservations for this service
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
      )
      .collect();

    // Filter active reservations
    const activeStatuses = ["pending", "confirmed", "cardPlaced", "seated"];
    const activeReservations = reservations.filter((r) =>
      activeStatuses.includes(r.status)
    );

    // Collect all assigned table IDs
    const assignedTableIds = new Set<string>();
    for (const r of activeReservations) {
      for (const tableId of r.tableIds) {
        assignedTableIds.add(tableId);
      }
    }

    return {
      tables,
      assignedTableIds: Array.from(assignedTableIds),
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new table
 */
export const create = mutation({
  args: {
    name: v.string(),
    capacity: v.number(),
    zone: v.union(v.literal("salle"), v.literal("terrasse")),
    positionX: v.number(),
    positionY: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
    combinationDirection: v.optional(v.union(v.literal("horizontal"), v.literal("vertical"), v.literal("none"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Validate
    if (args.name.length < 1 || args.name.length > 20) {
      throw Errors.INVALID_INPUT("name", "1-20 caractères requis");
    }
    if (args.capacity < 1 || args.capacity > 20) {
      throw Errors.INVALID_INPUT("capacity", "1-20 personnes");
    }
    if (args.positionX < 0 || args.positionY < 0) {
      throw Errors.INVALID_INPUT("position", "Position invalide");
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    // Check name uniqueness
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_name", (q) =>
        q.eq("restaurantId", restaurant._id).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw Errors.INVALID_INPUT("name", "Ce nom de table existe déjà");
    }

    const now = Date.now();

    const tableId = await ctx.db.insert("tables", {
      restaurantId: restaurant._id,
      name: args.name,
      capacity: args.capacity,
      zone: args.zone,
      positionX: args.positionX,
      positionY: args.positionY,
      width: args.width,
      height: args.height,
      shape: args.shape,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Table created", { tableId, name: args.name });

    return { tableId };
  },
});

/**
 * Update a table
 */
export const update = mutation({
  args: {
    tableId: v.id("tables"),
    name: v.optional(v.string()),
    capacity: v.optional(v.number()),
    zone: v.optional(v.union(v.literal("salle"), v.literal("terrasse"))),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
    combinationDirection: v.optional(v.union(v.literal("horizontal"), v.literal("vertical"), v.literal("none"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw Errors.NOT_FOUND("tables", args.tableId);
    }

    // Validate name if provided
    if (args.name !== undefined) {
      if (args.name.length < 1 || args.name.length > 20) {
        throw Errors.INVALID_INPUT("name", "1-20 caractères requis");
      }

      // Check uniqueness if name changed
      if (args.name !== table.name) {
        const newName = args.name;
        const existing = await ctx.db
          .query("tables")
          .withIndex("by_restaurant_name", (q) =>
            q.eq("restaurantId", table.restaurantId).eq("name", newName)
          )
          .first();

        if (existing) {
          throw Errors.INVALID_INPUT("name", "Ce nom de table existe déjà");
        }
      }
    }

    // Validate capacity if provided
    if (args.capacity !== undefined && (args.capacity < 1 || args.capacity > 20)) {
      throw Errors.INVALID_INPUT("capacity", "1-20 personnes");
    }

    const { tableId, ...updates } = args;
    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.capacity !== undefined) patch.capacity = updates.capacity;
    if (updates.zone !== undefined) patch.zone = updates.zone;
    if (updates.positionX !== undefined) patch.positionX = updates.positionX;
    if (updates.positionY !== undefined) patch.positionY = updates.positionY;
    if (updates.width !== undefined) patch.width = updates.width;
    if (updates.height !== undefined) patch.height = updates.height;
    if (updates.shape !== undefined) patch.shape = updates.shape;

    await ctx.db.patch(args.tableId, patch);

    console.log("Table updated", { tableId: args.tableId });

    return { tableId: args.tableId };
  },
});

/**
 * Delete a table permanently
 */
export const remove = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, { tableId }) => {
    await requireRole(ctx, "admin");

    const table = await ctx.db.get(tableId);
    if (!table) {
      throw Errors.NOT_FOUND("tables", tableId);
    }

    // Check if table is assigned to any active reservation
    const activeStatuses = ["pending", "confirmed", "cardPlaced", "seated"] as const;
    let hasActiveReservation = false;
    for (const status of activeStatuses) {
      const reservations = await ctx.db
        .query("reservations")
        .withIndex("by_restaurant_status", (q) =>
          q.eq("restaurantId", table.restaurantId).eq("status", status)
        )
        .collect();
      if (reservations.some((r) => r.tableIds.includes(tableId))) {
        hasActiveReservation = true;
        break;
      }
    }

    if (hasActiveReservation) {
      throw Errors.INVALID_INPUT(
        "tableId",
        "Cette table est assignée à une réservation active"
      );
    }

    await ctx.db.delete(tableId);

    console.log("Table deleted", { tableId, name: table.name });

    return { ok: true };
  },
});

/**
 * Deactivate a table (soft delete)
 */
export const deactivate = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, { tableId }) => {
    await requireRole(ctx, "admin");

    const table = await ctx.db.get(tableId);
    if (!table) {
      throw Errors.NOT_FOUND("tables", tableId);
    }

    await ctx.db.patch(tableId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    console.log("Table deactivated", { tableId, name: table.name });

    return { ok: true };
  },
});

/**
 * Activate a table
 */
export const activate = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, { tableId }) => {
    await requireRole(ctx, "admin");

    const table = await ctx.db.get(tableId);
    if (!table) {
      throw Errors.NOT_FOUND("tables", tableId);
    }

    await ctx.db.patch(tableId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    console.log("Table activated", { tableId, name: table.name });

    return { ok: true };
  },
});

/**
 * Duplicate a table with offset position
 */
export const duplicate = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, { tableId }) => {
    await requireRole(ctx, "admin");

    const table = await ctx.db.get(tableId);
    if (!table) {
      throw Errors.NOT_FOUND("tables", tableId);
    }

    // Generate new name
    const baseName = table.name.replace(/\d+$/, "");
    const existingTables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", (q) =>
        q.eq("restaurantId", table.restaurantId)
      )
      .collect();

    let counter = 1;
    let newName = `${baseName}${counter}`;
    while (existingTables.some((t) => t.name === newName)) {
      counter++;
      newName = `${baseName}${counter}`;
    }

    const now = Date.now();
    const pos = getPosition(table);

    const newTableId = await ctx.db.insert("tables", {
      restaurantId: table.restaurantId,
      name: newName,
      capacity: table.capacity,
      zone: table.zone,
      positionX: pos.x + TABLE_GRID_SPAN,
      positionY: pos.y,
      width: table.width,
      height: table.height,
      shape: table.shape,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Table duplicated", { originalId: tableId, newId: newTableId, newName });

    return { tableId: newTableId };
  },
});

/**
 * Activate all terrace tables
 */
export const activateTerrace = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const terraceTables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_zone", (q) =>
        q.eq("restaurantId", restaurant._id).eq("zone", "terrasse")
      )
      .collect();

    const now = Date.now();
    let count = 0;

    for (const table of terraceTables) {
      if (!table.isActive) {
        await ctx.db.patch(table._id, { isActive: true, updatedAt: now });
        count++;
      }
    }

    console.log("Terrace activated", { count });

    return { count };
  },
});

/**
 * Deactivate all terrace tables
 */
export const deactivateTerrace = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const terraceTables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_zone", (q) =>
        q.eq("restaurantId", restaurant._id).eq("zone", "terrasse")
      )
      .collect();

    const now = Date.now();
    let count = 0;

    for (const table of terraceTables) {
      if (table.isActive) {
        await ctx.db.patch(table._id, { isActive: false, updatedAt: now });
        count++;
      }
    }

    console.log("Terrace deactivated", { count });

    return { count };
  },
});

/**
 * Assign tables to a reservation
 */
export const assignToReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    tableIds: v.array(v.id("tables")),
  },
  handler: async (ctx, { reservationId, tableIds }) => {
    await requireRole(ctx, "admin");

    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw Errors.NOT_FOUND("reservations", reservationId);
    }

    // Check all tables exist and are active
    for (const tableId of tableIds) {
      const table = await ctx.db.get(tableId);
      if (!table) {
        throw Errors.NOT_FOUND("tables", tableId);
      }
      if (!table.isActive) {
        throw Errors.INVALID_INPUT("tableIds", `Table ${table.name} est désactivée`);
      }
    }

    // Check for conflicts (tables already assigned to another reservation in same service)
    const serviceReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q
          .eq("restaurantId", reservation.restaurantId)
          .eq("dateKey", reservation.dateKey)
          .eq("service", reservation.service)
      )
      .collect();

    const activeStatuses = ["pending", "confirmed", "cardPlaced", "seated"];
    const activeReservations = serviceReservations.filter(
      (r) => r._id !== reservationId && activeStatuses.includes(r.status)
    );

    for (const tableId of tableIds) {
      const table = await ctx.db.get(tableId);
      const conflict = activeReservations.find((r) =>
        r.tableIds.some((id) => id === tableId)
      );

      if (conflict) {
        throw Errors.INVALID_INPUT(
          "tableIds",
          `Table ${table?.name} déjà assignée à ${conflict.lastName}`
        );
      }
    }

    // Update reservation
    await ctx.db.patch(reservationId, {
      tableIds,
      updatedAt: Date.now(),
      version: reservation.version + 1,
    });

    // Get table names for logging
    const tableNames = await Promise.all(
      tableIds.map(async (id) => {
        const t = await ctx.db.get(id);
        return t?.name ?? "?";
      })
    );

    console.log("Tables assigned", {
      reservationId,
      tableIds,
      tableNames,
      partySize: reservation.partySize,
    });

    return { ok: true, tableNames };
  },
});

