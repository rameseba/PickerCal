import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByRut = query({
  args: { rut: v.string() },
  handler: async (ctx, args) => {
    if (!args.rut) return [];
    return await ctx.db
      .query("dailyBonuses")
      .withIndex("by_rut_date", (q) => q.eq("rut", args.rut))
      .collect();
  },
});

export const getAllBonuses = query({
  handler: async (ctx) => {
    return await ctx.db.query("dailyBonuses").collect();
  },
});

export const save = mutation({
  args: {
    rut: v.string(),
    date: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyBonuses")
      .withIndex("by_rut_date", (q) => q.eq("rut", args.rut).eq("date", args.date))
      .first();

    if (existing) {
      if (args.amount === 0) {
        await ctx.db.delete(existing._id);
        return { deleted: true };
      } else {
        await ctx.db.replace(existing._id, args);
        return existing._id;
      }
    }

    if (args.amount !== 0) {
      return await ctx.db.insert("dailyBonuses", args);
    }
    return { success: true };
  },
});
