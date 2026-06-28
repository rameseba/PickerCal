import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    rut: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
  }).index("by_rut", ["rut"]),

  history: defineTable({
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
  }).index("by_rut", ["rut"]),

  settings: defineTable({
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
  }).index("by_rut", ["rut"]),

  dailyBonuses: defineTable({
    rut: v.string(),
    date: v.string(),
    amount: v.number(),
  }).index("by_rut_date", ["rut", "date"]),

  reports: defineTable({
    pickerName: v.string(),
    pickerRut: v.string(),
    description: v.string(),
    screenshot: v.optional(v.string()),
    date: v.string(),
  }),
});
