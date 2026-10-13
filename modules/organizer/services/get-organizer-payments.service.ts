import { and, desc, eq, gte, min, sql } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { eventFunctions, events, functionZones, orderItems, orders } from "@/lib/db/schema"
import { calculatePlatformFee } from "@/modules/payments/utils/platform-fee"

export interface OrganizerPayment {
  orderId: string
  eventTitle: string
  gross: number
  fee: number
  net: number
  paidAt: Date
}

export interface OrganizerPayments {
  totals: { gross: number; fee: number; net: number; orders: number }
  payments: OrganizerPayment[]
}

export interface OrganizerPaymentsOptions {
  feePercent: number
  since?: Date
  limit?: number
}

// One row per paid order, counting only the items that belong to the organizer's
// events. The fee is not persisted: it is recomputed per order with the same
// calculatePlatformFee used at checkout. Totals sum every order in the period;
// only the list is cut to `limit`.
// ponytail: loads every order of the period to sum per-order fees in JS; move to SQL if volumes grow.
export async function getOrganizerPayments(
  db: Db,
  organizer: { id: string },
  { feePercent, since, limit = 50 }: OrganizerPaymentsOptions,
): Promise<OrganizerPayments> {
  const rows = await db
    .select({
      orderId: orders.id,
      eventTitle: min(events.title),
      grossMinor: sql<string>`round(sum(${orderItems.unitPrice} * ${orderItems.quantity}) * 100)`,
      paidAt: orders.createdAt,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(functionZones, eq(functionZones.id, orderItems.functionZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .where(
      and(
        eq(events.organizerId, organizer.id),
        eq(orders.status, "paid"),
        since ? gte(orders.createdAt, since) : undefined,
      ),
    )
    .groupBy(orders.id, orders.createdAt)
    .orderBy(desc(orders.createdAt), desc(orders.id))

  const all = rows.map((row) => {
    const grossMinor = Number(row.grossMinor)
    const feeMinor = calculatePlatformFee(grossMinor, feePercent)
    return {
      orderId: row.orderId,
      eventTitle: row.eventTitle ?? "",
      gross: grossMinor / 100,
      fee: feeMinor / 100,
      net: (grossMinor - feeMinor) / 100,
      paidAt: row.paidAt,
      grossMinor,
      feeMinor,
    }
  })

  const grossMinor = all.reduce((sum, p) => sum + p.grossMinor, 0)
  const feeMinor = all.reduce((sum, p) => sum + p.feeMinor, 0)

  return {
    totals: {
      gross: grossMinor / 100,
      fee: feeMinor / 100,
      net: (grossMinor - feeMinor) / 100,
      orders: all.length,
    },
    payments: all.slice(0, limit).map((p) => ({
      orderId: p.orderId,
      eventTitle: p.eventTitle,
      gross: p.gross,
      fee: p.fee,
      net: p.net,
      paidAt: p.paidAt,
    })),
  }
}
