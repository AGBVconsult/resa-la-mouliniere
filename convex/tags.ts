import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";

/**
 * List all tags sorted alphabetically.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "staff");

    const tags = await ctx.db
      .query("tags")
      .collect();

    return tags
      .map((t) => t.name)
      .sort((a, b) => a.localeCompare(b, "fr"));
  },
});

/**
 * Create a new tag if it doesn't exist.
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Le nom du tag ne peut pas être vide");
    }

    // Check if tag already exists (case-insensitive)
    const existing = await ctx.db
      .query("tags")
      .filter((q) => q.eq(q.field("name"), trimmed))
      .first();

    if (existing) {
      return existing._id;
    }

    const identity = await ctx.auth.getUserIdentity();

    const tagId = await ctx.db.insert("tags", {
      name: trimmed,
      createdAt: Date.now(),
      createdBy: identity?.subject,
    });

    return tagId;
  },
});
