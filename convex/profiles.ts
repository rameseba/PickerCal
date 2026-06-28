import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("profiles").collect();
  },
});

export const create = mutation({
  args: {
    rut: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .first();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      rut: args.rut,
      name: args.name,
      phone: args.phone,
      password: args.password,
    });
  },
});

export const update = mutation({
  args: {
    rut: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        phone: args.phone,
        password: args.password,
      });
      return { success: true };
    }
    return { success: false, error: "Perfil no encontrado" };
  },
});
