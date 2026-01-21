/**
 * @deprecated Ce fichier contient des stubs non implémentés.
 * Utilisez `floorplan.ts` pour les fonctionnalités de plan de salle.
 * 
 * Ces exports sont conservés pour la compatibilité API mais lèvent une erreur.
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTables = query({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.optional(v.string()),
  },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.floorplan.getTableStates à la place");
  },
});

export const assignTables = mutation({
  args: { reservationId: v.string(), tableIds: v.array(v.string()), expectedVersion: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.floorplan.assign à la place");
  },
});

export const upsertTable = mutation({
  args: {
    tableId: v.optional(v.string()),
    restaurantId: v.string(),
    name: v.string(),
    zone: v.union(v.literal("dining"), v.literal("terrace")),
    capacity: v.number(),
    gridX: v.number(),
    gridY: v.number(),
    isActive: v.boolean(),
  },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.tables.upsert à la place");
  },
});
