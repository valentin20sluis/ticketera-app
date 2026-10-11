import { and, count, eq, inArray, sql } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { eventFunctions, events, functionZones, orderItems, orders } from "@/lib/db/schema"
import {
  listEventsForViewer,
  resolveEventScope,
  type EventViewer,
  type ViewerEvent,
} from "@/modules/events/services/list-events-for-viewer.service"

export interface OrganizerEventSummary extends ViewerEvent {
  ticketsSold: number
  revenue: number
}

export interface OrganizerSummary {
  totalTicketsSold: number
  totalRevenue: number
  publishedEventsCount: number
  publishedEvents: OrganizerEventSummary[]
  events: OrganizerEventSummary[]
}

const EMPTY_SUMMARY: OrganizerSummary = {
  totalTicketsSold: 0,
  totalRevenue: 0,
  publishedEventsCount: 0,
  publishedEvents: [],
  events: [],
}

// Sales/revenue come only from orders.status = "paid" (pending/expired/cancelled
// orders never happened). Totals cover every event the viewer owns, in any
// status, so a sale on a since-cancelled or unpublished event still counts
// towards their historical totals; "publishedEvents" is the subset the organizer
// asked to see listed, sorted by tickets sold (ties broken by revenue).
// Always the viewer's OWN events, even for admin/super_admin.
export async function getOrganizerSummary(db: Db, viewer: EventViewer): Promise<OrganizerSummary> {
  if (!viewer || resolveEventScope(viewer).kind === "public") return EMPTY_SUMMARY

  // The list (and per-event sales) is bounded by listEventsForViewer's default limit;
  // the totals below are SQL aggregates over ALL the viewer's events, so they never
  // depend on that limit.
  const ownEvents = await listEventsForViewer(db, viewer, { organizerId: viewer.id })
  if (ownEvents.length === 0) return EMPTY_SUMMARY

  const [[totals], [published]] = await Promise.all([
    db
      .select({
        tickets: sql<string>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenue: sql<string>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(functionZones, eq(functionZones.id, orderItems.functionZoneId))
      .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
      .innerJoin(events, eq(events.id, eventFunctions.eventId))
      .where(and(eq(events.organizerId, viewer.id), eq(orders.status, "paid"))),
    db
      .select({ value: count() })
      .from(events)
      .where(and(eq(events.organizerId, viewer.id), eq(events.status, "published"))),
  ])

  const salesRows = await db
    .select({
      eventId: eventFunctions.eventId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(functionZones, eq(functionZones.id, orderItems.functionZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .where(and(inArray(eventFunctions.eventId, ownEvents.map((event) => event.id)), eq(orders.status, "paid")))

  const salesByEvent = new Map<string, { ticketsSold: number; revenue: number }>()
  for (const row of salesRows) {
    const current = salesByEvent.get(row.eventId) ?? { ticketsSold: 0, revenue: 0 }
    current.ticketsSold += row.quantity
    current.revenue += Number(row.unitPrice) * row.quantity
    salesByEvent.set(row.eventId, current)
  }

  const allEvents: OrganizerEventSummary[] = ownEvents.map((event) => ({
    ...event,
    ...(salesByEvent.get(event.id) ?? { ticketsSold: 0, revenue: 0 }),
  }))

  const publishedEvents = allEvents
    .filter((event) => event.status === "published")
    .sort((a, b) => b.ticketsSold - a.ticketsSold || b.revenue - a.revenue)

  return {
    totalTicketsSold: Number(totals.tickets),
    totalRevenue: Number(totals.revenue),
    publishedEventsCount: Number(published.value),
    publishedEvents,
    events: allEvents,
  }
}
