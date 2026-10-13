import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { seedEventCatalog } from "@/lib/db/seed/event-catalog"
import { createTestDb } from "@/lib/db/test-helpers"
import { eventFunctions, events, functionZones, orderItems, orders, users } from "@/lib/db/schema"
import { MOCK_EVENTS } from "@/modules/events/data/events.mock"
import { getPlatformSummary } from "./get-platform-summary.service"

type TestDb = Awaited<ReturnType<typeof createTestDb>>

async function addUser(db: TestDb, role: "super_admin" | "admin" | "organizer" | "customer", extra = {}) {
  const id = crypto.randomUUID()
  const [user] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${id}`, email: `${id}@example.com`, fullName: "U", role, ...extra })
    .returning()
  return user
}

async function setup() {
  const db = await createTestDb()
  const organizer = await addUser(db, "organizer")
  await seedEventCatalog(db, organizer.id)
  const [event] = await db.select().from(events).where(eq(events.slug, MOCK_EVENTS[0].slug))
  const [fn] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, event.id))
  const [zone] = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id))
  return { db, organizer, event, zone }
}

async function placeOrder(
  db: TestDb,
  functionZoneId: string,
  quantity: number,
  unitPrice: string,
  status: "pending" | "paid" | "expired" | "cancelled",
) {
  const customer = await addUser(db, "customer")
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

describe("getPlatformSummary", () => {
  it("returns zeros with every key present on an empty database", async () => {
    const db = await createTestDb()
    expect(await getPlatformSummary(db, 10)).toEqual({
      usersByRole: { super_admin: 0, admin: 0, organizer: 0, customer: 0 },
      activeOrganizers: 0,
      eventsByStatus: { draft: 0, published: 0, cancelled: 0, suspended: 0 },
      ticketsSold: 0,
      grossRevenue: 0,
      platformFee: 0,
    })
  })

  it("counts users by role, excluding deleted and including suspended", async () => {
    const db = await createTestDb()
    await addUser(db, "customer")
    await addUser(db, "customer", { isSuspended: true })
    await addUser(db, "customer", { deletedAt: new Date() })
    await addUser(db, "admin")

    const { usersByRole } = await getPlatformSummary(db, 10)
    expect(usersByRole).toEqual({ super_admin: 0, admin: 1, organizer: 0, customer: 2 })
  })

  it("counts active organizers once, excluding suspended, deleted and without published events", async () => {
    const { db, event } = await setup() // organizer with all published events (counts once)
    const withEvent = async (extra: object, status: "published" | "draft" = "published") => {
      const user = await addUser(db, "organizer", extra)
      await db.insert(events).values({ ...event, id: crypto.randomUUID(), slug: `s-${user.id}`, organizerId: user.id, status })
    }
    await withEvent({ isSuspended: true })
    await withEvent({ deletedAt: new Date() })
    await withEvent({}, "draft")
    await addUser(db, "organizer") // no events
    await withEvent({}) // active

    expect((await getPlatformSummary(db, 10)).activeOrganizers).toBe(2)
  })

  it("counts events by status", async () => {
    const { db, event } = await setup()
    await db.update(events).set({ status: "draft" }).where(eq(events.id, event.id))

    const { eventsByStatus } = await getPlatformSummary(db, 10)
    expect(eventsByStatus).toEqual({ draft: 1, published: MOCK_EVENTS.length - 1, cancelled: 0, suspended: 0 })
  })

  it("sums only paid orders into tickets and revenue", async () => {
    const { db, zone } = await setup()
    await placeOrder(db, zone.id, 3, "50.00", "paid")
    await placeOrder(db, zone.id, 2, "80.00", "paid")
    await placeOrder(db, zone.id, 9, "50.00", "pending")
    await placeOrder(db, zone.id, 9, "50.00", "expired")
    await placeOrder(db, zone.id, 9, "50.00", "cancelled")

    const result = await getPlatformSummary(db, 10)
    expect(result.ticketsSold).toBe(5)
    expect(result.grossRevenue).toBe(310)
  })

  it("rounds the fee per order, not on the total", async () => {
    const { db, zone } = await setup()
    await placeOrder(db, zone.id, 1, "100.00", "paid")
    await placeOrder(db, zone.id, 1, "10.55", "paid")

    expect((await getPlatformSummary(db, 10)).platformFee).toBeCloseTo(10 + 1.06, 2)
    expect((await getPlatformSummary(db, 0)).platformFee).toBe(0)
  })

  it.each([null, -1, 101, Number.NaN])("returns a null fee for invalid percent %s without throwing", async (percent) => {
    const { db, zone } = await setup()
    await placeOrder(db, zone.id, 1, "100.00", "paid")

    const result = await getPlatformSummary(db, percent)
    expect(result.platformFee).toBeNull()
    expect(result.grossRevenue).toBe(100)
  })
})
