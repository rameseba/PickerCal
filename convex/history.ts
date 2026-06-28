import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByRut = query({
  args: { rut: v.string() },
  handler: async (ctx, args) => {
    if (!args.rut) return [];
    return await ctx.db
      .query("history")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .collect();
  },
});

export const getAllHistory = query({
  handler: async (ctx) => {
    return await ctx.db.query("history").collect();
  },
});

export const add = mutation({
  args: {
    rut: v.string(),
    pedidoId: v.string(),
    date: v.string(),
    totalProductos: v.number(),
    sinStock: v.number(),
    pickeados: v.number(),
    sustituidos: v.number(),
    productosSolicitados: v.number(),
    isWeekendRate: v.boolean(),
    pickingTime: v.string(),
    extraBonus: v.number(),
    earnings: v.object({
      effectiveSkuCount: v.number(),
      skuRate: v.number(),
      skuPayment: v.number(),
      basePayment: v.number(),
      extraBonus: v.number(),
      grossTotal: v.number(),
      taxRetention: v.number(),
      netTotal: v.number(),
      isSpecialRate: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("history")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .filter((q) => q.eq(q.field("pedidoId"), args.pedidoId))
      .first();

    if (existing) {
      await ctx.db.replace(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("history", args);
  },
});

export const addBatch = mutation({
  args: {
    rut: v.string(),
    items: v.array(v.object({
      pedidoId: v.string(),
      date: v.string(),
      totalProductos: v.number(),
      sinStock: v.number(),
      pickeados: v.number(),
      sustituidos: v.number(),
      productosSolicitados: v.number(),
      isWeekendRate: v.boolean(),
      pickingTime: v.string(),
      extraBonus: v.number(),
      earnings: v.object({
        effectiveSkuCount: v.number(),
        skuRate: v.number(),
        skuPayment: v.number(),
        basePayment: v.number(),
        extraBonus: v.number(),
        grossTotal: v.number(),
        taxRetention: v.number(),
        netTotal: v.number(),
        isSpecialRate: v.optional(v.boolean()),
      }),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const item of args.items) {
      const existing = await ctx.db
        .query("history")
        .withIndex("by_rut", (q) => q.eq("rut", args.rut))
        .filter((q) => q.eq(q.field("pedidoId"), item.pedidoId))
        .first();

      if (existing) {
        await ctx.db.replace(existing._id, { ...item, rut: args.rut });
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert("history", { ...item, rut: args.rut });
        ids.push(id);
      }
    }
    return ids;
  },
});

export const deleteItem = mutation({
  args: { rut: v.string(), pedidoId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("history")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .filter((q) => q.eq(q.field("pedidoId"), args.pedidoId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true };
    }
    return { success: false, error: "Pedido no encontrado" };
  },
});

export const clear = mutation({
  args: { rut: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("history")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { success: true, count: items.length };
  },
});
