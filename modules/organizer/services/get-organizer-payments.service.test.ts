import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { seedEventCatalog } from "@/lib/db/seed/event-catalog"
import { createTestDb } from "@/lib/db/test-helpers"
import { eventFunctions, events, functionZones, orderItems, orders, users } from "@/lib/db/schema"
import { MOCK_EVENTS } from "@/modules/events/data/events.mock"
import { getOrganizerPayments } from "./get-organizer-payments.service"

type TestDb = Awaited<ReturnType<typeof createTestDb>>
type Status = "pending" | "paid" | "expired" | "cancelled"

async function setup() {
  const db = await createTestDb()
  const [organizer] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_org", email: "o@example.com", fullName: "O", role: "organizer" })
    .returning()
  await seedEventCatalog(db, organizer.id)
  const [eventA] = await db.select().from(events).where(eq(events.slug, MOCK_EVENTS[0].slug))
  const [fnA] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventA.id))
  const [zoneA] = await db.select().from(functionZones).where(eq(functionZones.functionId, fnA.id))
  return { db, organizer, eventA, fnA, zoneA }
}

async function placeOrder(
  db: TestDb,
  items: { zoneId: string; quantity: number; unitPrice: string }[],
  status: Status = "paid",
  createdAt: Date = new Date(),
) {
  const [customer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "c@example.com", fullName: "C", role: "customer" })
    .returning()
  const total = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)
  const [order] = await db
    .insert(orders)
    .values({
      customerId: customer.id,
      status,
      totalAmount: total.toFixed(2),
      currency: "PEN",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt,
    })
    .returning()
  await db
    .insert(orderItems)
    .values(items.map((i) => ({ orderId: order.id, functionZoneId: i.zoneId, quantity: i.quantity, unitPrice: i.unitPrice })))
  return order
}

const one = (zoneId: string, quantity: number, unitPrice: string) => [{ zoneId, quantity, unitPrice }]

describe("getOrganizerPayments", () => {
  it("returns zeros and an empty list with no orders", async () => {
    const { db, organizer } = await setup()
    expect(await getOrganizerPayments(db, organizer, { feePercent: 10 })).toEqual({
      totals: { gross: 0, fee: 0, net: 0, orders: 0 },
      payments: [],
    })
  })

  it("counts only paid orders and computes gross, fee and net with 10%", async () => {
    const { db, organizer, eventA, zoneA } = await setup()
    const paid = await placeOrder(db, one(zoneA.id, 2, "50.00"))
    for (const status of ["pending", "expired", "cancelled"] as const) {
      await placeOrder(db, one(zoneA.id, 5, "50.00"), status)
    }

    const result = await getOrganizerPayments(db, organizer, { feePercent: 10 })

    expect(result.totals).toEqual({ gross: 100, fee: 10, net: 90, orders: 1 })
    expect(result.payments).toEqual([
      { orderId: paid.id, eventTitle: eventA.title, gross: 100, fee: 10, net: 90, paidAt: paid.createdAt },
    ])
  })

  it("has fee 0 and net = gross with 0%", async () => {
    const { db, organizer, zoneA } = await setup()
    await placeOrder(db, one(zoneA.id, 1, "33.33"))
    const result = await getOrganizerPayments(db, organizer, { feePercent: 0 })
    expect(result.totals).toEqual({ gross: 33.33, fee: 0, net: 33.33, orders: 1 })
  })

  it("rounds the fee half-up in minor units per order", async () => {
    const { db, organizer, zoneA } = await setup()
    await placeOrder(db, one(zoneA.id, 1, "10.05")) // 1005 * 10% = 100.5 -> 101
    const [payment] = (await getOrganizerPayments(db, organizer, { feePercent: 10 })).payments
    expect(payment).toMatchObject({ gross: 10.05, fee: 1.01, net: 9.04 })
  })

  it("ignores other organizers' sales", async () => {
    const { db, organizer, eventA, zoneA } = await setup()
    await placeOrder(db, one(zoneA.id, 1, "50.00"))
    const [other] = await db
      .insert(users)
      .values({ clerkUserId: "clerk_other", email: "x@example.com", fullName: "X", role: "organizer" })
      .returning()
    const [foreign] = await db
      .insert(events)
      .values({ ...eventA, id: crypto.randomUUID(), slug: "foreign", organizerId: other.id })
      .returning()
    const [fnF] = await db.insert(eventFunctions).values({ eventId: foreign.id, startsAt: new Date() }).returning()
    const [zoneF] = await db
      .insert(functionZones)
      .values({ ...zoneA, id: crypto.randomUUID(), functionId: fnF.id })
      .returning()
    await placeOrder(db, one(zoneF.id, 7, "99.00"))

    const mine = await getOrganizerPayments(db, organizer, { feePercent: 10 })
    expect(mine.totals.gross).toBe(50)
    expect(mine.payments).toHaveLength(1)
    expect((await getOrganizerPayments(db, other, { feePercent: 10 })).totals.gross).toBe(693)
  })

  it("counts sales of cancelled events", async () => {
    const { db, organizer, eventA, zoneA } = await setup()
    await placeOrder(db, one(zoneA.id, 1, "50.00"))
    await db.update(events).set({ status: "cancelled" }).where(eq(events.id, eventA.id))
    expect((await getOrganizerPayments(db, organizer, { feePercent: 10 })).totals.orders).toBe(1)
  })

  it("groups an order with items from several functions into one row", async () => {
    const { db, organizer, eventA, zoneA } = await setup()
    const [fn2] = await db.insert(eventFunctions).values({ eventId: eventA.id, startsAt: new Date() }).returning()
    const [zone2] = await db
      .insert(functionZones)
      .values({ ...zoneA, id: crypto.randomUUID(), functionId: fn2.id })
      .returning()

    await placeOrder(db, [
      { zoneId: zoneA.id, quantity: 1, unitPrice: "40.00" },
      { zoneId: zone2.id, quantity: 2, unitPrice: "30.00" },
    ])

    const result = await getOrganizerPayments(db, organizer, { feePercent: 10 })
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0]).toMatchObject({ gross: 100, fee: 10, net: 90 })
    expect(result.totals.orders).toBe(1)
  })

  it("totals cover all orders while payments are limited and newest first", async () => {
    const { db, organizer, zoneA } = await setup()
    const base = Date.UTC(2030, 0, 1)
    const created = []
    for (let i = 0; i < 5; i++) {
      created.push(await placeOrder(db, one(zoneA.id, 1, "10.00"), "paid", new Date(base + i * 1000)))
    }

    const result = await getOrganizerPayments(db, organizer, { feePercent: 10, limit: 3 })

    expect(result.totals).toEqual({ gross: 50, fee: 5, net: 45, orders: 5 })
    expect(result.payments.map((p) => p.orderId)).toEqual([created[4].id, created[3].id, created[2].id])
  })

  it("defaults the limit to 50", async () => {
    const { db, organizer, zoneA } = await setup()
    for (let i = 0; i < 51; i++) await placeOrder(db, one(zoneA.id, 1, "1.00"))
    const result = await getOrganizerPayments(db, organizer, { feePercent: 10 })
    expect(result.payments).toHaveLength(50)
    expect(result.totals.orders).toBe(51)
  })

  it("filters by since (inclusive) and keeps all history without it", async () => {
    const { db, organizer, zoneA } = await setup()
    const since = new Date("2030-06-01T00:00:00Z")
    await placeOrder(db, one(zoneA.id, 1, "10.00"), "paid", new Date("2030-05-31T23:59:59Z"))
    await placeOrder(db, one(zoneA.id, 1, "20.00"), "paid", since)
    await placeOrder(db, one(zoneA.id, 1, "30.00"), "paid", new Date("2030-07-01T00:00:00Z"))

    expect((await getOrganizerPayments(db, organizer, { feePercent: 10, since })).totals.gross).toBe(50)
    expect((await getOrganizerPayments(db, organizer, { feePercent: 10 })).totals.gross).toBe(60)
  })
})
