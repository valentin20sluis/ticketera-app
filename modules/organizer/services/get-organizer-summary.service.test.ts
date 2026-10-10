import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { seedEventCatalog } from "@/lib/db/seed/event-catalog"
import { createTestDb } from "@/lib/db/test-helpers"
import { eventFunctions, events, functionZones, orderItems, orders, users } from "@/lib/db/schema"
import { MOCK_EVENTS } from "@/modules/events/data/events.mock"
import { getOrganizerSummary } from "./get-organizer-summary.service"

type TestDb = Awaited<ReturnType<typeof createTestDb>>

const SLUG_A = MOCK_EVENTS[0].slug
const SLUG_B = MOCK_EVENTS[1].slug

async function setup() {
  const db = await createTestDb()
  const [organizer] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_org", email: "o@example.com", fullName: "O", role: "organizer" })
    .returning()
  await seedEventCatalog(db, organizer.id)
  const [eventA] = await db.select().from(events).where(eq(events.slug, SLUG_A))
  const [eventB] = await db.select().from(events).where(eq(events.slug, SLUG_B))
  const [fnA] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventA.id))
  const [fnB] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventB.id))
  const [zoneA] = await db.select().from(functionZones).where(eq(functionZones.functionId, fnA.id))
  const [zoneB] = await db.select().from(functionZones).where(eq(functionZones.functionId, fnB.id))
  return { db, organizer, eventA, eventB, zoneA, zoneB }
}

async function placeOrder(
  db: TestDb,
  functionZoneId: string,
  quantity: number,
  unitPrice: string,
  status: "pending" | "paid" | "expired" | "cancelled",
) {
  const [customer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "c@example.com", fullName: "C", role: "customer" })
    .returning()
  const [order] = await db
    .insert(orders)
    .values({
      customerId: customer.id,
      status,
      totalAmount: (Number(unitPrice) * quantity).toFixed(2),
      currency: "PEN",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
    .returning()
  await db.insert(orderItems).values({ orderId: order.id, functionZoneId, quantity, unitPrice })
}

describe("getOrganizerSummary", () => {
  it("returns all zeros for an organizer with no events", async () => {
    const db = await createTestDb()
    const [organizer] = await db
      .insert(users)
      .values({ clerkUserId: "clerk_empty", email: "empty@example.com", fullName: "E", role: "organizer" })
      .returning()

    expect(await getOrganizerSummary(db, organizer.id)).toEqual({
      totalTicketsSold: 0,
      totalRevenue: 0,
      publishedEventsCount: 0,
      publishedEvents: [],
    })
  })

  it("lists published events with zero sales when nobody has bought yet", async () => {
    const { db, organizer } = await setup()
    const result = await getOrganizerSummary(db, organizer.id)

    expect(result.totalTicketsSold).toBe(0)
    expect(result.totalRevenue).toBe(0)
    expect(result.publishedEventsCount).toBe(MOCK_EVENTS.length)
    expect(result.publishedEvents).toHaveLength(MOCK_EVENTS.length)
    expect(result.publishedEvents.every((e) => e.ticketsSold === 0 && e.revenue === 0)).toBe(true)
  })

  it("sums only paid orders into tickets sold and revenue, per event and in total", async () => {
    const { db, organizer, eventA, eventB, zoneA, zoneB } = await setup()
    await placeOrder(db, zoneA.id, 3, "50.00", "paid")
    await placeOrder(db, zoneA.id, 1, "50.00", "paid")
    await placeOrder(db, zoneB.id, 2, "80.00", "paid")
    await placeOrder(db, zoneA.id, 10, "50.00", "pending")
    await placeOrder(db, zoneB.id, 10, "80.00", "expired")
    await placeOrder(db, zoneA.id, 10, "50.00", "cancelled")

    const result = await getOrganizerSummary(db, organizer.id)

    expect(result.totalTicketsSold).toBe(3 + 1 + 2)
    expect(result.totalRevenue).toBe(4 * 50 + 2 * 80)

    const summaryA = result.publishedEvents.find((e) => e.id === eventA.id)
    const summaryB = result.publishedEvents.find((e) => e.id === eventB.id)
    expect(summaryA).toMatchObject({ ticketsSold: 4, revenue: 200, imageUrl: eventA.imageUrl })
    expect(summaryB).toMatchObject({ ticketsSold: 2, revenue: 160, imageUrl: eventB.imageUrl })
  })

  it("sorts published events by tickets sold, descending", async () => {
    const { db, organizer, eventA, eventB, zoneA, zoneB } = await setup()
    await placeOrder(db, zoneA.id, 2, "50.00", "paid")
    await placeOrder(db, zoneB.id, 9, "80.00", "paid")

    const result = await getOrganizerSummary(db, organizer.id)
    const ids = result.publishedEvents.map((e) => e.id)
    expect(ids.indexOf(eventB.id)).toBeLessThan(ids.indexOf(eventA.id))
  })

  it("counts a draft event's historical paid sales in the totals but excludes it from the published list", async () => {
    const { db, organizer, eventA, zoneA } = await setup()
    await placeOrder(db, zoneA.id, 5, "50.00", "paid")
    await db.update(events).set({ status: "draft" }).where(eq(events.id, eventA.id))

    const result = await getOrganizerSummary(db, organizer.id)

    expect(result.totalTicketsSold).toBe(5)
    expect(result.totalRevenue).toBe(250)
    expect(result.publishedEventsCount).toBe(MOCK_EVENTS.length - 1)
    expect(result.publishedEvents.some((e) => e.id === eventA.id)).toBe(false)
  })
})
