import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Sauvegarde ou met à jour un brouillon de réservation.
 * Appelé depuis le widget quand le client passe l'étape contact (step 3 → 4).
 * Upsert basé sur sessionId pour éviter les doublons.
 */
export const save = mutation({
  args: {
    sessionId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    language: v.optional(
      v.union(v.literal("fr"), v.literal("nl"), v.literal("en"), v.literal("de"), v.literal("it"), v.literal("es"))
    ),
    adults: v.number(),
    childrenCount: v.number(),
    babyCount: v.number(),
    dateKey: v.optional(v.string()),
    service: v.optional(v.union(v.literal("lunch"), v.literal("dinner"))),
    timeKey: v.optional(v.string()),
    note: v.optional(v.string()),
    lastStep: v.number(),
    referralSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw new Error("No active restaurant found");
    }

    // Upsert: check if draft already exists for this session
    const existing = await ctx.db
      .query("bookingDrafts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (existing) {
      // Update existing draft
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        language: args.language,
        adults: args.adults,
        childrenCount: args.childrenCount,
        babyCount: args.babyCount,
        dateKey: args.dateKey,
        service: args.service,
        timeKey: args.timeKey,
        note: args.note,
        lastStep: args.lastStep,
        referralSource: args.referralSource,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new draft
    const draftId = await ctx.db.insert("bookingDrafts", {
      restaurantId: restaurant._id,
      sessionId: args.sessionId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      language: args.language,
      adults: args.adults,
      childrenCount: args.childrenCount,
      babyCount: args.babyCount,
      dateKey: args.dateKey,
      service: args.service,
      timeKey: args.timeKey,
      note: args.note,
      lastStep: args.lastStep,
      referralSource: args.referralSource,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + DRAFT_TTL_MS,
    });

    return draftId;
  },
});

/**
 * Supprime le brouillon après confirmation de la réservation.
 */
export const deleteDraft = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("bookingDrafts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (draft) {
      await ctx.db.delete(draft._id);
    }
  },
});

/**
 * Liste les brouillons (non finalisés) pour le dashboard admin.
 * Tous les drafts présents en base sont des réservations non finalisées
 * (les finalisées sont supprimées à la confirmation).
 * Filtré par date optionnelle.
 */
export const list = query({
  args: {
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) return [];

    let drafts;
    if (args.dateKey) {
      drafts = await ctx.db
        .query("bookingDrafts")
        .withIndex("by_restaurant_date", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", args.dateKey)
        )
        .collect();
    } else {
      drafts = await ctx.db
        .query("bookingDrafts")
        .withIndex("by_restaurant_date", (q) =>
          q.eq("restaurantId", restaurant._id)
        )
        .collect();
    }

    return drafts
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((d) => ({
        _id: d._id,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        language: d.language,
        adults: d.adults,
        childrenCount: d.childrenCount,
        babyCount: d.babyCount,
        partySize: d.adults + d.childrenCount + d.babyCount,
        dateKey: d.dateKey,
        service: d.service,
        timeKey: d.timeKey,
        lastStep: d.lastStep,
        referralSource: d.referralSource,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
  },
});

/**
 * Nettoyage des brouillons expirés (appelé par un cron job).
 */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("bookingDrafts")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    for (const draft of expired) {
      await ctx.db.delete(draft._id);
    }

    return { deleted: expired.length };
  },
});
