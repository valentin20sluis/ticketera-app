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
  return { db, organizer, eventA, eventB, fnA, fnB, zoneA, zoneB }
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

    expect(await getOrganizerSummary(db, organizer)).toEqual({
      totalTicketsSold: 0,
      totalRevenue: 0,
      publishedEventsCount: 0,
      publishedEvents: [],
      events: [],
    })
  })

  it("lists published events with zero sales when nobody has bought yet", async () => {
    const { db, organizer } = await setup()
    const result = await getOrganizerSummary(db, organizer)

    expect(result.totalTicketsSold).toBe(0)
    expect(result.totalRevenue).toBe(0)
    expect(result.publishedEventsCount).toBe(MOCK_EVENTS.length)
    expect(result.publishedEvents).toHaveLength(MOCK_EVENTS.length)
    expect(result.publishedEvents.every((e) => e.ticketsSold === 0 && e.revenue === 0)).toBe(true)
  })

  it("sums only paid orders into tickets sold and revenue, per event and in total", async () => {
    const { db, organizer, eventA, eventB, fnA, fnB, zoneA, zoneB } = await setup()
    await placeOrder(db, zoneA.id, 3, "50.00", "paid")
    await placeOrder(db, zoneA.id, 1, "50.00", "paid")
    await placeOrder(db, zoneB.id, 2, "80.00", "paid")
    await placeOrder(db, zoneA.id, 10, "50.00", "pending")
    await placeOrder(db, zoneB.id, 10, "80.00", "expired")
    await placeOrder(db, zoneA.id, 10, "50.00", "cancelled")

    const result = await getOrganizerSummary(db, organizer)

    expect(result.totalTicketsSold).toBe(3 + 1 + 2)
    expect(result.totalRevenue).toBe(4 * 50 + 2 * 80)

    const summaryA = result.publishedEvents.find((e) => e.id === eventA.id)
    const summaryB = result.publishedEvents.find((e) => e.id === eventB.id)
    expect(summaryA).toMatchObject({
      ticketsSold: 4,
      revenue: 200,
      imageUrl: eventA.imageUrl,
      startDate: fnA.startsAt.toISOString(),
    })
    expect(summaryB).toMatchObject({
      ticketsSold: 2,
      revenue: 160,
      imageUrl: eventB.imageUrl,
      startDate: fnB.startsAt.toISOString(),
    })
  })

  it("uses the earliest function's date when an event has more than one", async () => {
    const { db, organizer, eventA, fnA } = await setup()
    const earlier = new Date(fnA.startsAt.getTime() - 30 * 24 * 60 * 60 * 1000)
    await db.insert(eventFunctions).values({ eventId: eventA.id, startsAt: earlier })

    const result = await getOrganizerSummary(db, organizer)
    const summaryA = result.publishedEvents.find((e) => e.id === eventA.id)
    expect(summaryA?.startDate).toBe(earlier.toISOString())
  })

  it("sorts published events by tickets sold, descending", async () => {
    const { db, organizer, eventA, eventB, zoneA, zoneB } = await setup()
    await placeOrder(db, zoneA.id, 2, "50.00", "paid")
    await placeOrder(db, zoneB.id, 9, "80.00", "paid")

    const result = await getOrganizerSummary(db, organizer)
    const ids = result.publishedEvents.map((e) => e.id)
    expect(ids.indexOf(eventB.id)).toBeLessThan(ids.indexOf(eventA.id))
  })

  it("counts a draft event's historical paid sales in the totals but excludes it from the published list", async () => {
    const { db, organizer, eventA, zoneA } = await setup()
    await placeOrder(db, zoneA.id, 5, "50.00", "paid")
    await db.update(events).set({ status: "draft" }).where(eq(events.id, eventA.id))

    const result = await getOrganizerSummary(db, organizer)

    expect(result.totalTicketsSold).toBe(5)
    expect(result.totalRevenue).toBe(250)
    expect(result.publishedEventsCount).toBe(MOCK_EVENTS.length - 1)
    expect(result.publishedEvents.some((e) => e.id === eventA.id)).toBe(false)
    expect(result.events.find((e) => e.id === eventA.id)).toMatchObject({ status: "draft", ticketsSold: 5, revenue: 250 })
  })

  it("includes every status in events with status and zero sales for draft and cancelled", async () => {
    const { db, organizer, eventA, eventB } = await setup()
    await db.update(events).set({ status: "draft" }).where(eq(events.id, eventA.id))
    await db.update(events).set({ status: "cancelled" }).where(eq(events.id, eventB.id))

    const result = await getOrganizerSummary(db, organizer)

    expect(result.events).toHaveLength(MOCK_EVENTS.length)
    expect(result.events.find((e) => e.id === eventA.id)).toMatchObject({ status: "draft", ticketsSold: 0, revenue: 0 })
    expect(result.events.find((e) => e.id === eventB.id)).toMatchObject({ status: "cancelled", ticketsSold: 0, revenue: 0 })
    expect(result.publishedEvents.every((e) => e.status === "published")).toBe(true)
  })

  it("orders events by created_at descending", async () => {
    const { db, organizer, eventA, eventB } = await setup()
    await db.update(events).set({ createdAt: new Date("2030-01-01") }).where(eq(events.id, eventB.id))
    await db.update(events).set({ createdAt: new Date("2020-01-01") }).where(eq(events.id, eventA.id))

    const ids = (await getOrganizerSummary(db, organizer)).events.map((e) => e.id)
    expect(ids[0]).toBe(eventB.id)
    expect(ids[ids.length - 1]).toBe(eventA.id)
  })

  describe("totals beyond the list limit", () => {
    it("includes every event and paid sale with 105 events, ignoring non-paid and foreign orders", async () => {
      const { db, organizer, eventA, zoneA } = await setup()
      const template = eventA
      const inserted = await db
        .insert(events)
        .values(
          Array.from({ length: 105 - MOCK_EVENTS.length }, (_, i) => ({
            ...template,
            id: crypto.randomUUID(),
            slug: `extra-${i}`,
            createdAt: new Date(Date.UTC(2031, 0, 1, 0, i)),
          })),
        )
        .returning()
      // eventA becomes older than the 100 most recent: outside the list
      await db.update(events).set({ createdAt: new Date("2000-01-01") }).where(eq(events.id, eventA.id))
      const [fnX] = await db.insert(eventFunctions).values({ eventId: inserted[0].id, startsAt: new Date() }).returning()
      const [zoneX] = await db
        .insert(functionZones)
        .values({ ...zoneA, id: crypto.randomUUID(), functionId: fnX.id })
        .returning()

      await placeOrder(db, zoneA.id, 3, "50.00", "paid")
      await placeOrder(db, zoneX.id, 2, "10.55", "paid")
      await placeOrder(db, zoneX.id, 9, "10.55", "pending")
      await placeOrder(db, zoneA.id, 9, "50.00", "cancelled")

      const [other] = await db
        .insert(users)
        .values({ clerkUserId: "clerk_other", email: "other@example.com", fullName: "X", role: "organizer" })
        .returning()
      const [foreign] = await db
        .insert(events)
        .values({ ...template, id: crypto.randomUUID(), slug: "foreign", organizerId: other.id })
        .returning()
      const [fnF] = await db.insert(eventFunctions).values({ eventId: foreign.id, startsAt: new Date() }).returning()
      const [zoneF] = await db
        .insert(functionZones)
        .values({ ...zoneA, id: crypto.randomUUID(), functionId: fnF.id })
        .returning()
      await placeOrder(db, zoneF.id, 7, "99.00", "paid")

      const result = await getOrganizerSummary(db, organizer)

      expect(result.events.some((e) => e.id === eventA.id)).toBe(false)
      expect(result.events).toHaveLength(100)
      expect(result.totalTicketsSold).toBe(5)
      expect(result.totalRevenue).toBeCloseTo(3 * 50 + 2 * 10.55, 2)
      expect(result.publishedEventsCount).toBe(105)
    })
  })

  describe("scope", () => {
    const EMPTY = { totalTicketsSold: 0, totalRevenue: 0, publishedEventsCount: 0, publishedEvents: [], events: [] }

    it.each(["anonymous", "customer", "suspended", "deleted"] as const)(
      "returns the empty summary for a %s viewer even with paid sales",
      async (kind) => {
        const { db, organizer, zoneA } = await setup()
        await placeOrder(db, zoneA.id, 2, "50.00", "paid")
        const viewers = {
          anonymous: null,
          customer: { ...organizer, role: "customer" as const },
          suspended: { ...organizer, isSuspended: true },
          deleted: { ...organizer, deletedAt: new Date() },
        }

        expect(await getOrganizerSummary(db, viewers[kind])).toEqual(EMPTY)
      },
    )

    it.each(["admin", "super_admin"] as const)(
      "%s only gets their own events; another organizer's paid sales do not count",
      async (role) => {
        const { db, organizer, zoneA } = await setup()
        await placeOrder(db, zoneA.id, 4, "50.00", "paid")
        const [admin] = await db
          .insert(users)
          .values({ clerkUserId: `clerk_${role}`, email: `${role}@example.com`, fullName: "A", role })
          .returning()

        expect(await getOrganizerSummary(db, admin)).toEqual(EMPTY)
        expect((await getOrganizerSummary(db, organizer)).totalTicketsSold).toBe(4)
      },
    )
  })
})
