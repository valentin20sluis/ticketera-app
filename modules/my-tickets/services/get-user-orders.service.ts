import { and, desc, eq, inArray } from "drizzle-orm"
import {
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  venueZones,
  venues,
} from "@/lib/db/schema"
import type { Db } from "@/lib/db/client"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"

export async function getPaidOrdersForUser(db: Db, userId: string): Promise<ConfirmedOrder[]> {
  const rows = await db
    .select({
      orderId: orders.id,
      totalAmount: orders.totalAmount,
      invoiceUrl: orders.invoiceUrl,
      itemId: orderItems.id,
      functionZoneId: orderItems.functionZoneId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      zoneName: venueZones.name,
      eventTitle: events.title,
      eventImageUrl: events.imageUrl,
      venueName: venues.name,
      city: venues.city,
      startsAt: eventFunctions.startsAt,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(functionZones, eq(functionZones.id, orderItems.functionZoneId))
    .innerJoin(venueZones, eq(venueZones.id, functionZones.venueZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .where(and(eq(orders.customerId, userId), eq(orders.status, "paid")))
    .orderBy(desc(orders.createdAt), orders.id, orderItems.id)

  if (rows.length === 0) return []

  const ticketRows = await db
    .select({ orderItemId: tickets.orderItemId, qrCode: tickets.qrCode })
    .from(tickets)
    .where(inArray(tickets.orderItemId, rows.map((r) => r.itemId)))
    .orderBy(tickets.createdAt, tickets.qrCode)

  const qrByItem = new Map<string, string[]>()
  for (const t of ticketRows) {
    qrByItem.set(t.orderItemId, [...(qrByItem.get(t.orderItemId) ?? []), t.qrCode])
  }

  // Una orden pertenece a un solo evento: el evento se toma del primer order_item.
  const byOrder = new Map<string, ConfirmedOrder>()
  for (const r of rows) {
    const unitPrice = Number(r.unitPrice)
    let order = byOrder.get(r.orderId)
    if (!order) {
      order = {
        orderNumber: `TKT-${r.orderId.slice(0, 8).toUpperCase()}`,
        eventTitle: r.eventTitle,
        eventImageUrl: r.eventImageUrl,
        venueName: r.venueName,
        city: r.city,
        startDate: r.startsAt.toISOString(),
        lines: [],
        totalQuantity: 0,
        totalAmount: Number(r.totalAmount),
        invoiceUrl: r.invoiceUrl ?? undefined,
        ticketQrCodes: [],
      }
      byOrder.set(r.orderId, order)
    }
    order.lines.push({
      zoneId: r.functionZoneId,
      zoneName: r.zoneName,
      price: unitPrice,
      quantity: r.quantity,
      subtotal: unitPrice * r.quantity,
    })
    order.totalQuantity += r.quantity
    order.ticketQrCodes = [...(order.ticketQrCodes ?? []), ...(qrByItem.get(r.itemId) ?? [])]
  }

  return [...byOrder.values()]
}
