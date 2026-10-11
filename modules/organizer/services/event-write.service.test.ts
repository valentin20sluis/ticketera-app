import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { seedEventCatalog } from "@/lib/db/seed/event-catalog"
import { createTestDb } from "@/lib/db/test-helpers"
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  users,
  venues,
  venueZones,
} from "@/lib/db/schema"
import type { CreateEventFormValues } from "@/modules/organizer/schemas/create-event.schema"
import {
  createEvent,
  deleteEvent,
  EventActionError,
  setEventStatus,
  updateEvent,
} from "./event-write.service"

const FUTURE = "2099-05-10T19:00"

async function setup() {
  const db = await createTestDb()
  const insertUser = async (role: "organizer" | "admin" | "super_admin" | "customer", tag: string) => {
    const [user] = await db
      .insert(users)
      .values({ clerkUserId: `clerk_${tag}`, email: `${tag}@example.com`, fullName: tag, role })
      .returning()
    return user
  }
  const orgA = await insertUser("organizer", "orga")
  const orgB = await insertUser("organizer", "orgb")
  const admin = await insertUser("admin", "admin")
  const root = await insertUser("super_admin", "root")
  const customer = await insertUser("customer", "cust")
  await seedEventCatalog(db, orgA.id)
  const [category] = await db.select().from(eventCategories).limit(1)
  const [venueA] = await db.select().from(venues).where(eq(venues.organizerId, orgA.id)).limit(1)

  const form = (over: Partial<CreateEventFormValues> = {}): CreateEventFormValues => ({
    details: {
      title: "Concierto de Prueba",
      description: "Una descripción de al menos diez caracteres",
      categoryId: category.id,
      imageUrl: "https://example.com/image.jpg",
      doorsOpenTime: "19:00",
      showStartTime: "20:30",
      minimumAge: "18+",
      admissionType: "General",
    },
    venue: { mode: "new", venue: { name: "Arena", address: "Av. Siempre Viva 123", city: "Lima", lat: -12, lng: -77 } },
    functionZones: {
      startsAt: FUTURE,
      zones: [
        { name: "General", capacity: 100, price: 50 },
        { name: "VIP", capacity: 20, price: 150 },
      ],
    },
    ...over,
  })

  const counts = async () => ({
    events: (await db.select().from(events)).length,
    venues: (await db.select().from(venues)).length,
    venueZones: (await db.select().from(venueZones)).length,
    functions: (await db.select().from(eventFunctions)).length,
    functionZones: (await db.select().from(functionZones)).length,
  })

  const order = async (eventId: string, status: "pending" | "paid" | "expired") => {
    const [fn] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId))
    const [zone] = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id)).limit(1)
    const [o] = await db
      .insert(orders)
      .values({ customerId: customer.id, status, totalAmount: "50.00", expiresAt: new Date(Date.now() + 60_000) })
      .returning()
    await db.insert(orderItems).values({ orderId: o.id, functionZoneId: zone.id, quantity: 1, unitPrice: "50.00" })
  }

  return { db, orgA, orgB, admin, root, customer, category, venueA, form, counts, order }
}

const rejects = (promise: Promise<unknown>) => expect(promise).rejects.toBeInstanceOf(EventActionError)

describe("createEvent", () => {
  it("creates draft event, venue, function and zones for the organizer", async () => {
    const { db, orgA, form } = await setup()
    const { id } = await createEvent(db, orgA, form())

    const [event] = await db.select().from(events).where(eq(events.id, id))
    expect(event.status).toBe("draft")
    expect(event.organizerId).toBe(orgA.id)
    expect(event.slug).toMatch(/^concierto-de-prueba-[0-9a-f]{8}$/)
    const [fn] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, id))
    expect(fn.startsAt.toISOString()).toBe("2099-05-11T00:00:00.000Z")
    const zones = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id))
    expect(zones.map((z) => z.price).sort()).toEqual(["150.00", "50.00"])
  })

  it("ignores ownerId from an organizer but honours it for admin and super_admin", async () => {
    const { db, orgA, orgB, admin, root, form } = await setup()
    const own = await createEvent(db, orgA, form(), orgB.id)
    const byAdmin = await createEvent(db, admin, form(), orgB.id)
    const byRoot = await createEvent(db, root, form(), orgB.id)
    const owner = async (id: string) => (await db.select().from(events).where(eq(events.id, id)))[0].organizerId
    expect(await owner(own.id)).toBe(orgA.id)
    expect(await owner(byAdmin.id)).toBe(orgB.id)
    expect(await owner(byRoot.id)).toBe(orgB.id)
  })

  it("denies customer, suspended, deleted and anonymous actors", async () => {
    const { db, orgA, customer, form } = await setup()
    await rejects(createEvent(db, customer, form()))
    await rejects(createEvent(db, null, form()))
    await rejects(createEvent(db, { ...orgA, isSuspended: true }, form()))
    await rejects(createEvent(db, { ...orgA, deletedAt: new Date() }, form()))
  })

  it("rejects another organizer's venue and writes nothing", async () => {
    const { db, orgB, venueA, form, counts } = await setup()
    const before = await counts()
    await rejects(createEvent(db, orgB, form({ venue: { mode: "existing", venueId: venueA.id } })))
    expect(await counts()).toEqual(before)
  })

  it("rolls back everything when a late step fails", async () => {
    const { db, orgA, form, counts } = await setup()
    const before = await counts()
    // Zone price above numeric(10,2) fails at the last insert, after venue and event exist.
    const bad = form({
      functionZones: { startsAt: FUTURE, zones: [{ name: "General", capacity: 10, price: 1e12 }] },
    })
    await expect(createEvent(db, orgA, bad)).rejects.toBeDefined()
    expect(await counts()).toEqual(before)
  })

  it("rejects non-http image urls, bad dates and unknown categories", async () => {
    const { db, orgA, form } = await setup()
    const base = form()
    await rejects(createEvent(db, orgA, { ...base, details: { ...base.details, imageUrl: "javascript:alert(1)" } }))
    await rejects(createEvent(db, orgA, { ...base, functionZones: { ...base.functionZones, startsAt: "mañana" } }))
    await rejects(
      createEvent(db, orgA, { ...base, details: { ...base.details, categoryId: crypto.randomUUID() } }),
    )
  })
})

describe("updateEvent", () => {
  it("replaces function and zones without orders, with no orphan venue zones", async () => {
    const { db, orgA, form, counts } = await setup()
    const { id } = await createEvent(db, orgA, form())
    const [created] = await db.select().from(events).where(eq(events.id, id))
    const before = await counts()

    await updateEvent(
      db,
      orgA,
      id,
      form({
        details: { ...form().details, title: "Nuevo título" },
        venue: { mode: "existing", venueId: created.venueId },
        functionZones: { startsAt: "2099-06-01T20:00", zones: [{ name: "Único", capacity: 5, price: 10 }] },
      }),
    )

    const after = await counts()
    expect(after.functions).toBe(before.functions)
    expect(after.functionZones).toBe(before.functionZones - 1)
    expect(after.venueZones).toBe(before.venueZones - 1)
    const [event] = await db.select().from(events).where(eq(events.id, id))
    expect(event.title).toBe("Nuevo título")
  })

  it("applies only details when an order references the event", async () => {
    for (const status of ["pending", "paid", "expired"] as const) {
      const { db, orgA, form, order } = await setup()
      const { id } = await createEvent(db, orgA, form())
      await order(id, status)
      await updateEvent(
        db,
        orgA,
        id,
        form({
          details: { ...form().details, title: "Solo detalle" },
          functionZones: { startsAt: "2099-12-31T20:00", zones: [{ name: "Xx", capacity: 1, price: 1 }] },
        }),
      )
      const [event] = await db.select().from(events).where(eq(events.id, id))
      const [fn] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, id))
      const zones = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id))
      expect(event.title).toBe("Solo detalle")
      expect(fn.startsAt.toISOString()).toBe("2099-05-11T00:00:00.000Z")
      expect(zones).toHaveLength(2)
    }
  })

  it("denies other organizers, cancelled events and organizers on suspended events", async () => {
    const { db, orgA, orgB, admin, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await rejects(updateEvent(db, orgB, id, form()))
    await setEventStatus(db, orgA, id, "published")
    await setEventStatus(db, admin, id, "suspended")
    await rejects(updateEvent(db, orgA, id, form()))
    await updateEvent(db, admin, id, form({ venue: { mode: "existing", venueId: (await db.select().from(events).where(eq(events.id, id)))[0].venueId } }))
    await setEventStatus(db, admin, id, "cancelled")
    await rejects(updateEvent(db, admin, id, form()))
  })

  it("rejects a venue that belongs to the owner's rival even when an admin edits", async () => {
    const { db, orgA, orgB, admin, form, venueA } = await setup()
    const { id } = await createEvent(db, orgB, form())
    // venueA belongs to orgA, the event belongs to orgB: the admin must not cross them.
    await rejects(updateEvent(db, admin, id, form({ venue: { mode: "existing", venueId: venueA.id } })))
    expect(orgA.id).not.toBe(orgB.id)
  })

  it("reports a missing or malformed id as not found", async () => {
    const { db, orgA, form } = await setup()
    await rejects(updateEvent(db, orgA, "nope", form()))
    await rejects(updateEvent(db, orgA, crypto.randomUUID(), form()))
  })
})

describe("setEventStatus", () => {
  it("lets an organizer publish and cancel but never suspend or revert", async () => {
    const { db, orgA, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await rejects(setEventStatus(db, orgA, id, "suspended"))
    await setEventStatus(db, orgA, id, "published")
    await rejects(setEventStatus(db, orgA, id, "draft"))
    await setEventStatus(db, orgA, id, "cancelled")
    await rejects(setEventStatus(db, orgA, id, "published"))
  })

  it("lets admin suspend and lift the suspension; organizer cannot lift it", async () => {
    const { db, orgA, root, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, id, "published")
    await setEventStatus(db, root, id, "suspended")
    await rejects(setEventStatus(db, orgA, id, "published"))
    await setEventStatus(db, root, id, "published")
  })

  it("refuses to publish without a future function", async () => {
    const { db, orgA, form } = await setup()
    const { id } = await createEvent(db, orgA, form({
      functionZones: { startsAt: "2000-01-01T10:00", zones: [{ name: "Gg", capacity: 1, price: 1 }] },
    }))
    await rejects(setEventStatus(db, orgA, id, "published"))
  })

  it("denies other organizers", async () => {
    const { db, orgA, orgB, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await rejects(setEventStatus(db, orgB, id, "published"))
  })
})

describe("deleteEvent", () => {
  it("deletes a draft without orders and leaves no orphans", async () => {
    const { db, orgA, form, counts } = await setup()
    const before = await counts()
    const { id } = await createEvent(db, orgA, form())
    await deleteEvent(db, orgA, id)
    const after = await counts()
    expect(after).toEqual({ ...before, venues: before.venues + 1 })
  })

  it("refuses non-drafts, events with orders and other organizers' events", async () => {
    const { db, orgA, orgB, admin, form, order } = await setup()
    const published = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, published.id, "published")
    await rejects(deleteEvent(db, orgA, published.id))

    for (const status of ["pending", "paid", "expired"] as const) {
      const withOrder = await createEvent(db, orgA, form())
      await order(withOrder.id, status)
      await rejects(deleteEvent(db, orgA, withOrder.id))
      await rejects(deleteEvent(db, admin, withOrder.id))
    }

    const draft = await createEvent(db, orgA, form())
    await rejects(deleteEvent(db, orgB, draft.id))
    await deleteEvent(db, admin, draft.id)
  })
})
