/**
 * PRD-011: Assignment Logs for Shadow Learning
 * 
 * Logs table assignments for ML training and shadow comparison.
 * Phase 1: Manual logging only
 * Phase 2+: ML predictions and shadow metrics
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireRole } from "./lib/rbac";
import { generateTablesSnapshot, type Phase } from "./lib/snapshot";
import { 
  computeServiceOccupancy, 
  getPartySizeCategory,
  computeShadowMetrics 
} from "./lib/shadowMetrics";
import { isTableSetAdjacent, getCanonicalZone } from "./lib/adjacency";

// Current scoring version
const CURRENT_SCORING_VERSION = "V0" as const;
const CURRENT_SCHEMA_VERSION = 4 as const;

// Current phase (will be configurable later)
const CURRENT_PHASE: Phase = "shadow";

/**
 * Log a table assignment (called after successful assign mutation)
 */
export const logAssignment = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    reservationId: v.id("reservations"),
    reservationVersion: v.number(),
    dateKey: v.string(),
    timeKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    partySize: v.number(),
    childrenCount: v.optional(v.number()),
    babiesCount: v.optional(v.number()),
    assignedTableIds: v.array(v.id("tables")),
    assignedBy: v.string(),
    assignmentMethod: v.union(
      v.literal("manual_click"),
      v.literal("suggestion_accepted"),
      v.literal("auto_vip"),
      v.literal("full_auto")
    ),
    isTest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Load assigned tables
    const assignedTables = await Promise.all(
      args.assignedTableIds.map(id => ctx.db.get(id))
    );
    const validTables = assignedTables.filter((t): t is Doc<"tables"> => t !== null);

    // Load all tables for snapshot
    const allTables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_isActive", q => 
        q.eq("restaurantId", args.restaurantId)
      )
      .collect();

    // Load reservations for this service
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", q =>
        q.eq("restaurantId", args.restaurantId)
          .eq("dateKey", args.dateKey)
          .eq("service", args.service)
      )
      .collect();

    // Compute available vs taken tables
    const activeStatuses = ["pending", "confirmed", "seated"];
    const takenTableIds = new Set<string>();
    for (const r of reservations) {
      if (activeStatuses.includes(r.status)) {
        for (const tableId of r.tableIds) {
          takenTableIds.add(tableId);
        }
      }
    }

    const activeTables = allTables.filter(t => t.isActive);
    const availableTableIds = activeTables
      .filter(t => !takenTableIds.has(t._id))
      .map(t => t._id);
    const takenTableIdsList = activeTables
      .filter(t => takenTableIds.has(t._id))
      .map(t => t._id);

    // Generate snapshot
    const tablesSnapshot = generateTablesSnapshot(
      availableTableIds,
      takenTableIdsList,
      { isTest: args.isTest ?? false, phase: CURRENT_PHASE }
    );

    // Compute service occupancy
    const occupancy = computeServiceOccupancy(reservations, allTables);

    // Compute assignment details
    const assignedCapacity = validTables.reduce((sum, t) => sum + t.capacity, 0);
    const assignedZone = getCanonicalZone(validTables);
    const assignedIsAdjacent = isTableSetAdjacent(validTables);
    const assignedTableNames = validTables.map(t => t.name);

    // Insert log
    const logId = await ctx.db.insert("assignmentLogs", {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      scoringVersion: CURRENT_SCORING_VERSION,
      isTest: args.isTest,

      restaurantId: args.restaurantId,
      reservationId: args.reservationId,
      reservationVersion: args.reservationVersion,
      date: args.dateKey,
      time: args.timeKey,
      service: args.service,
      partySize: args.partySize,
      partySizeCategory: getPartySizeCategory(args.partySize),
      childrenCount: args.childrenCount,
      babiesCount: args.babiesCount,

      tablesSnapshot,

      serviceOccupancy: {
        totalCovers: occupancy.totalCovers,
        totalCapacity: occupancy.totalCapacity,
        capacitySource: "active_tables" as const,
        occupancyRate: occupancy.occupancyRate,
        reservationsCount: occupancy.reservationsCount,
        zoneOccupancies: occupancy.zoneOccupancies,
      },

      assignedTables: args.assignedTableIds,
      assignedTableNames,
      assignedZone,
      assignedCapacity,
      assignedIsAdjacent,
      assignedBy: args.assignedBy,
      assignmentMethod: args.assignmentMethod,

      createdAt: now,
      updatedAt: now,
    });

    return { logId };
  },
});

/**
 * Query assignment logs for a date range
 */
export const listByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    service: v.optional(v.union(v.literal("lunch"), v.literal("dinner"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate, service, limit = 100 }) => {
    await requireRole(ctx, "admin");

    let logs;
    if (service) {
      logs = await ctx.db
        .query("assignmentLogs")
        .withIndex("by_date_service", q => 
          q.gte("date", startDate).lte("date", endDate)
        )
        .filter(q => q.eq(q.field("service"), service))
        .take(limit);
    } else {
      logs = await ctx.db
        .query("assignmentLogs")
        .withIndex("by_date", q => 
          q.gte("date", startDate).lte("date", endDate)
        )
        .take(limit);
    }

    return logs;
  },
});

/**
 * Get assignment log for a specific reservation
 */
export const getByReservation = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, { reservationId }) => {
    await requireRole(ctx, "admin");

    return ctx.db
      .query("assignmentLogs")
      .withIndex("by_reservation", q => q.eq("reservationId", reservationId))
      .first();
  },
});

/**
 * Get shadow learning statistics
 */
export const getShadowStats = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireRole(ctx, "admin");

    const logs = await ctx.db
      .query("assignmentLogs")
      .withIndex("by_date", q => 
        q.gte("date", startDate).lte("date", endDate)
      )
      .collect();

    // Compute statistics
    const logsWithMetrics = logs.filter(l => l.shadowMetrics);
    
    if (logsWithMetrics.length === 0) {
      return {
        totalLogs: logs.length,
        logsWithPrediction: 0,
        exactSetMatchRate: null,
        avgPartialMatchRatio: null,
        zoneMatchRate: null,
        errorSeverityDistribution: null,
      };
    }

    const exactMatches = logsWithMetrics.filter(l => l.shadowMetrics?.exactSetMatch).length;
    const zoneMatches = logsWithMetrics.filter(l => l.shadowMetrics?.zoneMatch).length;
    const avgPartialMatch = logsWithMetrics.reduce(
      (sum, l) => sum + (l.shadowMetrics?.partialMatchRatio ?? 0), 
      0
    ) / logsWithMetrics.length;

    const severityDist = {
      none: logsWithMetrics.filter(l => l.shadowMetrics?.errorSeverity === "none").length,
      minor: logsWithMetrics.filter(l => l.shadowMetrics?.errorSeverity === "minor").length,
      major: logsWithMetrics.filter(l => l.shadowMetrics?.errorSeverity === "major").length,
      critical: logsWithMetrics.filter(l => l.shadowMetrics?.errorSeverity === "critical").length,
    };

    return {
      totalLogs: logs.length,
      logsWithPrediction: logsWithMetrics.length,
      exactSetMatchRate: exactMatches / logsWithMetrics.length,
      avgPartialMatchRatio: avgPartialMatch,
      zoneMatchRate: zoneMatches / logsWithMetrics.length,
      errorSeverityDistribution: severityDist,
    };
  },
});

/**
 * Update feedback for an assignment log (when reservation completes)
 */
export const updateFeedback = internalMutation({
  args: {
    reservationId: v.id("reservations"),
    outcome: v.union(
      v.literal("completed"),
      v.literal("noshow"),
      v.literal("cancelled"),
      v.literal("table_changed")
    ),
    actualSeatedAt: v.optional(v.number()),
    actualCompletedAt: v.optional(v.number()),
    tableChanged: v.boolean(),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("assignmentLogs")
      .withIndex("by_reservation", q => q.eq("reservationId", args.reservationId))
      .first();

    if (!log) return { updated: false };

    const now = Date.now();
    await ctx.db.patch(log._id, {
      feedback: {
        outcome: args.outcome,
        actualSeatedAt: args.actualSeatedAt,
        actualCompletedAt: args.actualCompletedAt,
        tableChanged: args.tableChanged,
        feedbackRecordedAt: now,
      },
      updatedAt: now,
    });

    return { updated: true };
  },
});

/**
 * Archive old logs (24+ months)
 */
export const archiveOldLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const oldLogs = await ctx.db
      .query("assignmentLogs")
      .withIndex("by_date", q => q.lt("date", cutoffStr))
      .take(1000);

    let archived = 0;
    for (const log of oldLogs) {
      // In production, export to archive storage (S3/GCS) before deleting
      // For now, just delete
      await ctx.db.delete(log._id);
      archived++;
    }

    return { archived, cutoffDate: cutoffStr };
  },
});
