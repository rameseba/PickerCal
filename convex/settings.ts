import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByRut = query({
  args: { rut: v.string() },
  handler: async (ctx, args) => {
    if (!args.rut) return null;
    return await ctx.db
      .query("settings")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .first();
  },
});

export const getAllSettings = query({
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect();
  },
});

export const save = mutation({
  args: {
    rut: v.string(),
    skuTable: v.array(v.object({
      minSku: v.number(),
      maxSku: v.number(),
      rate: v.number(),
    })),
    basePayments: v.object({
      standard: v.number(),
      weekend: v.number(),
    }),
    taxRetentionPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .first();

    if (existing) {
      await ctx.db.replace(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("settings", args);
  },
});
