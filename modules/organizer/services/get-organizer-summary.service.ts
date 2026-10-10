import { and, eq } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { eventFunctions, events, functionZones, orderItems, orders } from "@/lib/db/schema"

export interface OrganizerEventSummary {
  id: string
  title: string
  slug: string
  ticketsSold: number
  revenue: number
}

export interface OrganizerSummary {
  totalTicketsSold: number
  totalRevenue: number
  publishedEventsCount: number
  publishedEvents: OrganizerEventSummary[]
}

// Sales/revenue come only from orders.status = "paid" (pending/expired/cancelled
// orders never happened). Totals cover every event the organizer owns, in any
// status, so a sale on a since-cancelled or unpublished event still counts
// towards their historical totals; "publishedEvents" is the subset the organizer
// asked to see listed, sorted by tickets sold (ties broken by revenue).
export async function getOrganizerSummary(db: Db, organizerId: string): Promise<OrganizerSummary> {
  const organizerEvents = await db
    .select({ id: events.id, title: events.title, slug: events.slug, status: events.status })
    .from(events)
    .where(eq(events.organizerId, organizerId))

  if (organizerEvents.length === 0) {
    return { totalTicketsSold: 0, totalRevenue: 0, publishedEventsCount: 0, publishedEvents: [] }
  }

  const salesRows = await db
    .select({
      eventId: events.id,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(functionZones, eq(functionZones.id, orderItems.functionZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .where(and(eq(events.organizerId, organizerId), eq(orders.status, "paid")))

  const salesByEvent = new Map<string, { ticketsSold: number; revenue: number }>()
  for (const row of salesRows) {
    const current = salesByEvent.get(row.eventId) ?? { ticketsSold: 0, revenue: 0 }
    current.ticketsSold += row.quantity
    current.revenue += Number(row.unitPrice) * row.quantity
    salesByEvent.set(row.eventId, current)
  }

  const allEvents = organizerEvents.map((event) => ({
    ...event,
    ...(salesByEvent.get(event.id) ?? { ticketsSold: 0, revenue: 0 }),
  }))

  const publishedEvents = allEvents
    .filter((event) => event.status === "published")
    .sort((a, b) => b.ticketsSold - a.ticketsSold || b.revenue - a.revenue)
    .map(({ id, title, slug, ticketsSold, revenue }) => ({ id, title, slug, ticketsSold, revenue }))

  return {
    totalTicketsSold: allEvents.reduce((sum, event) => sum + event.ticketsSold, 0),
    totalRevenue: allEvents.reduce((sum, event) => sum + event.revenue, 0),
    publishedEventsCount: publishedEvents.length,
    publishedEvents,
  }
}
