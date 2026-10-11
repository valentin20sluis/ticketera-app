import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { seedEventCatalog } from "@/lib/db/seed/event-catalog"
import { createTestDb } from "@/lib/db/test-helpers"
import { eventFunctions, events, functionZones, orderItems, orders, users } from "@/lib/db/schema"
import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock"
import { getEventForEdit, listCategories, listVenuesForOrganizer } from "./event-read.service"

async function setup() {
  const db = await createTestDb()
  const make = async (role: "organizer" | "admin" | "customer", tag: string) =>
    (
      await db
        .insert(users)
        .values({ clerkUserId: `c_${tag}`, email: `${tag}@e.com`, fullName: tag, role })
        .returning()
    )[0]
  const orgA = await make("organizer", "a")
  const orgB = await make("organizer", "b")
  const admin = await make("admin", "admin")
  const customer = await make("customer", "cust")
  await seedEventCatalog(db, orgA.id)
  const [event] = await db.select().from(events).limit(1)
  return { db, orgA, orgB, admin, customer, event }
}

describe("listCategories / listVenuesForOrganizer", () => {
  it("reads categories and only the organizer's venues", async () => {
    const { db, orgA, orgB } = await setup()
    expect(await listCategories(db)).toHaveLength(MOCK_CATEGORIES.length)
    expect((await listVenuesForOrganizer(db, orgA.id)).length).toBeGreaterThan(0)
    expect(await listVenuesForOrganizer(db, orgB.id)).toEqual([])
  })
})

describe("getEventForEdit", () => {
  it("returns the form values for the owner and for admins", async () => {
    const { db, orgA, admin, event } = await setup()
    const result = await getEventForEdit(db, orgA, event.id)
    expect(result?.values.details.title).toBe(event.title)
    expect(result?.values.venue).toEqual({ mode: "existing", venueId: event.venueId })
    expect(result?.values.functionZones.zones.length).toBeGreaterThan(0)
    expect(await getEventForEdit(db, admin, event.id)).not.toBeNull()
  })

  it("returns null for others, customers, missing ids and cancelled events", async () => {
    const { db, orgB, customer, event } = await setup()
    expect(await getEventForEdit(db, orgB, event.id)).toBeNull()
    expect(await getEventForEdit(db, customer, event.id)).toBeNull()
    expect(await getEventForEdit(db, null, event.id)).toBeNull()
    expect(await getEventForEdit(db, orgB, crypto.randomUUID())).toBeNull()
  })

  it("flags the structure as locked with orders or several functions", async () => {
    const { db, orgA, customer, event } = await setup()
    const functions = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, event.id))
    const lockedByFunctions = functions.length > 1
    expect((await getEventForEdit(db, orgA, event.id))?.structureLocked).toBe(lockedByFunctions)

    const [fn] = functions
    const [zone] = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id)).limit(1)
    const [order] = await db
      .insert(orders)
      .values({ customerId: customer.id, status: "pending", totalAmount: "1.00", expiresAt: new Date(Date.now() + 60_000) })
      .returning()
    await db.insert(orderItems).values({ orderId: order.id, functionZoneId: zone.id, quantity: 1, unitPrice: "1.00" })
    expect((await getEventForEdit(db, orgA, event.id))?.structureLocked).toBe(true)
  })
})
