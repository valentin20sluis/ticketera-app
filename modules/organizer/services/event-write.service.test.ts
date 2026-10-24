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
  setEventFeatured,
  setEventStatus,
  updateEvent,
} from "./event-write.service"

const FUTURE = "2099-05-10T19:00"

async function setup() {
  const db = await createTestDb()
  // Organizers get Stripe connected by default; pass withStripe=false for one that cannot publish.
  const insertUser = async (
    role: "organizer" | "admin" | "super_admin" | "customer",
    tag: string,
    withStripe = role === "organizer",
  ) => {
    const [user] = await db
      .insert(users)
      .values({
        clerkUserId: `clerk_${tag}`,
        email: `${tag}@example.com`,
        fullName: tag,
        role,
        ...(withStripe && { stripeAccountId: `acct_${tag}`, stripeChargesEnabled: true }),
      })
      .returning()
    return user
  }
  const orgA = await insertUser("organizer", "orga")
  const orgB = await insertUser("organizer", "orgb")
  const orgNoStripe = await insertUser("organizer", "orgnostripe", false)
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
    functions: [
      {
        startsAt: FUTURE,
        zones: [
          { name: "General", price: 50 },
          { name: "VIP", price: 150 },
        ],
      },
    ],
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

  return { db, orgA, orgB, orgNoStripe, admin, root, customer, category, venueA, form, counts, order }
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

  it("forces the default 10x10 layout and capacity 100 on every zone, ignoring client values", async () => {
    const { db, orgA, form } = await setup()
    const staleZone = { name: "Campo VIP", price: 50, seatRows: 4, seatColumns: 5 }
    const { id } = await createEvent(
      db,
      orgA,
      form({
        functions: [
          {
            startsAt: FUTURE,
            zones: [
              staleZone,
              { name: "General", price: 20 },
            ],
          },
        ],
      }),
    )
    const [fn] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, id))
    const rows = await db
      .select({ rows: venueZones.seatRows, cols: venueZones.seatColumns, vCap: venueZones.capacity, fCap: functionZones.capacity })
      .from(functionZones)
      .innerJoin(venueZones, eq(functionZones.venueZoneId, venueZones.id))
      .where(eq(functionZones.functionId, fn.id))
    expect(rows).toHaveLength(2)
    for (const row of rows) expect(row).toEqual({ rows: 10, cols: 10, vCap: 100, fCap: 100 })
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

  it("requires admins to name an active organizer as owner", async () => {
    const { db, admin, customer, form } = await setup()
    await rejects(createEvent(db, admin, form()))
    await rejects(createEvent(db, admin, form(), customer.id))
    await rejects(createEvent(db, admin, form(), crypto.randomUUID()))
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
      functions: [
        { startsAt: FUTURE, zones: [{ name: "Ok", price: 5 }] },
        { startsAt: "2099-06-10T19:00", zones: [{ name: "General", price: 1e12 }] },
      ],
    })
    await expect(createEvent(db, orgA, bad)).rejects.toBeDefined()
    expect(await counts()).toEqual(before)
  })

  it("rejects non-http image urls, bad dates and unknown categories", async () => {
    const { db, orgA, form } = await setup()
    const base = form()
    await rejects(createEvent(db, orgA, { ...base, details: { ...base.details, imageUrl: "javascript:alert(1)" } }))
    await rejects(createEvent(db, orgA, { ...base, functions: [{ ...base.functions[0], startsAt: "mañana" }] }))
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
        functions: [{ startsAt: "2099-06-01T20:00", zones: [{ name: "Único", price: 10 }] }],
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
          functions: [{ startsAt: "2099-12-31T20:00", zones: [{ name: "Xx", price: 1 }] }],
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

  const twoFunctions = (): CreateEventFormValues["functions"] => [
    { startsAt: "2099-05-10T19:00", zones: [{ name: "General", price: 5 }, { name: "VIP", price: 9 }] },
    { startsAt: "2099-05-11T19:00", zones: [{ name: "Platea", price: 7 }] },
  ]

  it("creates every function with its own zones in one go", async () => {
    const { db, orgA, form, counts } = await setup()
    const before = await counts()
    const { id } = await createEvent(db, orgA, form({ functions: twoFunctions() }))
    const after = await counts()
    expect(after.functions).toBe(before.functions + 2)
    expect(after.functionZones).toBe(before.functionZones + 3)
    expect(after.venueZones).toBe(before.venueZones + 3)
    expect(await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, id))).toHaveLength(2)
  })

  it("replaces all functions of a multi-function event without orphans", async () => {
    const { db, orgA, form, counts } = await setup()
    const { id } = await createEvent(db, orgA, form({ functions: twoFunctions() }))
    const venueId = (await db.select().from(events).where(eq(events.id, id)))[0].venueId
    const before = await counts()
    await updateEvent(
      db,
      orgA,
      id,
      form({
        venue: { mode: "existing", venueId },
        functions: [{ startsAt: "2099-07-01T20:00", zones: [{ name: "Único", price: 10 }] }],
      }),
    )
    const after = await counts()
    expect(after.functions).toBe(before.functions - 1)
    expect(after.functionZones).toBe(before.functionZones - 2)
    expect(after.venueZones).toBe(before.venueZones - 2)
  })

  it("keeps a multi-function structure intact when orders exist", async () => {
    const { db, orgA, form, order } = await setup()
    const { id } = await createEvent(db, orgA, form({ functions: twoFunctions() }))
    await order(id, "paid")
    await updateEvent(
      db,
      orgA,
      id,
      form({
        details: { ...form().details, title: "Solo detalle" },
        functions: [{ startsAt: "2099-12-31T20:00", zones: [{ name: "Xx", price: 1 }] }],
      }),
    )
    expect(await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, id))).toHaveLength(2)
    expect((await db.select().from(events).where(eq(events.id, id)))[0].title).toBe("Solo detalle")
  })

  it("lets a published event keep a past function if another is future, and refuses all-past", async () => {
    const { db, orgA, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, id, "published")
    const venueId = (await db.select().from(events).where(eq(events.id, id)))[0].venueId
    const venue = { mode: "existing" as const, venueId }
    const zones = [{ name: "Gg", price: 1 }]
    await updateEvent(
      db,
      orgA,
      id,
      form({ venue, functions: [{ startsAt: "2000-01-01T10:00", zones }, { startsAt: FUTURE, zones }] }),
    )
    await rejects(
      updateEvent(
        db,
        orgA,
        id,
        form({ venue, functions: [{ startsAt: "2000-01-01T10:00", zones }, { startsAt: "2001-01-01T10:00", zones }] }),
      ),
    )
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
      functions: [{ startsAt: "2000-01-01T10:00", zones: [{ name: "Gg", price: 1 }] }],
    }))
    await rejects(setEventStatus(db, orgA, id, "published"))
  })

  it("denies other organizers", async () => {
    const { db, orgA, orgB, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await rejects(setEventStatus(db, orgB, id, "published"))
  })
})

describe("setEventStatus requires Stripe on the event owner", () => {
  const OWN = "Conecta tu cuenta de Stripe para publicar eventos"
  const OWNER = "El organizador de este evento aún no conectó su cuenta de Stripe"
  const statusOf = async (db: Awaited<ReturnType<typeof setup>>["db"], id: string) =>
    (await db.select().from(events).where(eq(events.id, id)))[0]
  const rejectsWith = (promise: Promise<unknown>, message: string) =>
    expect(promise).rejects.toThrow(new EventActionError(message))

  it("blocks publishing without an account or with charges disabled (AC3, AC4)", async () => {
    const { db, orgNoStripe, form } = await setup()
    const { id } = await createEvent(db, orgNoStripe, form())
    const before = await statusOf(db, id)
    await rejectsWith(setEventStatus(db, orgNoStripe, id, "published"), OWN)

    await db.update(users).set({ stripeAccountId: "acct_x", stripeChargesEnabled: false }).where(eq(users.id, orgNoStripe.id))
    await rejectsWith(setEventStatus(db, orgNoStripe, id, "published"), OWN)

    const after = await statusOf(db, id)
    expect(after.status).toBe("draft")
    expect(after.updatedAt).toEqual(before.updatedAt)
  })

  it("publishes once the owner can charge (AC5)", async () => {
    const { db, orgNoStripe, form } = await setup()
    const { id } = await createEvent(db, orgNoStripe, form())
    await db.update(users).set({ stripeAccountId: "acct_x", stripeChargesEnabled: true }).where(eq(users.id, orgNoStripe.id))
    await setEventStatus(db, orgNoStripe, id, "published")
    expect((await statusOf(db, id)).status).toBe("published")
  })

  it("blocks admin reactivation for a not-ready owner and allows it for a ready one (AC6)", async () => {
    const { db, orgNoStripe, orgA, admin, form } = await setup()
    const ready = (await createEvent(db, orgA, form())).id
    await setEventStatus(db, orgA, ready, "published")
    await setEventStatus(db, admin, ready, "suspended")
    await setEventStatus(db, admin, ready, "published")

    const { id } = await createEvent(db, orgNoStripe, form())
    await db.update(events).set({ status: "suspended" }).where(eq(events.id, id))
    await rejectsWith(setEventStatus(db, admin, id, "published"), OWNER)
    expect((await statusOf(db, id)).status).toBe("suspended")
  })

  it("validates the owner, not the actor (AC7)", async () => {
    const { db, orgNoStripe, root, form } = await setup()
    const { id } = await createEvent(db, orgNoStripe, form())
    // Only suspended -> published is open to admins, so suspend the event first.
    await db.update(events).set({ status: "suspended" }).where(eq(events.id, id))
    await rejectsWith(setEventStatus(db, root, id, "published"), OWNER)
    expect((await statusOf(db, id)).status).toBe("suspended")
  })

  it("reports permission before Stripe (AC8)", async () => {
    const { db, orgNoStripe, orgA, customer, form } = await setup()
    const { id } = await createEvent(db, orgNoStripe, form())
    for (const actor of [orgA, customer, null]) {
      await rejectsWith(setEventStatus(db, actor, id, "published"), "No puedes modificar este evento")
    }
  })

  it("reports Stripe before the future-function rule (AC9)", async () => {
    const { db, orgNoStripe, form } = await setup()
    const { id } = await createEvent(db, orgNoStripe, form({
      functions: [{ startsAt: "2000-01-01T10:00", zones: [{ name: "Gg", price: 1 }] }],
    }))
    await rejectsWith(setEventStatus(db, orgNoStripe, id, "published"), OWN)
  })

  it("leaves already published events of a not-ready owner editable, cancellable, suspendable (AC10)", async () => {
    const { db, orgNoStripe, admin, form } = await setup()
    const ids = []
    for (let i = 0; i < 2; i++) {
      const { id } = await createEvent(db, orgNoStripe, form())
      await db.update(events).set({ status: "published" }).where(eq(events.id, id))
      ids.push(id)
    }
    const [a, b] = ids
    const venueId = (await statusOf(db, a)).venueId
    await updateEvent(db, orgNoStripe, a, form({ venue: { mode: "existing", venueId } }))
    await setEventFeatured(db, admin, a, true)
    await setEventStatus(db, admin, a, "suspended")
    await setEventStatus(db, orgNoStripe, b, "cancelled")
    expect((await statusOf(db, a)).status).toBe("suspended")
    expect((await statusOf(db, b)).status).toBe("cancelled")
  })

  it("keeps drafts free: create and update work without Stripe (AC11)", async () => {
    const { db, orgNoStripe, form } = await setup()
    const { id } = await createEvent(db, orgNoStripe, form())
    const venueId = (await statusOf(db, id)).venueId
    await updateEvent(db, orgNoStripe, id, form({ details: { ...form().details, title: "Otro" }, venue: { mode: "existing", venueId } }))
    expect((await statusOf(db, id)).title).toBe("Otro")
  })

  it("fails with the Stripe error, not STALE, when the flag drops between read and UPDATE (AC12)", async () => {
    const { db, orgA, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    // Run the owner's downgrade right before the events UPDATE hits the database.
    const racing = new Proxy(db, {
      get(target, prop, receiver) {
        if (prop !== "update") return Reflect.get(target, prop, receiver)
        return (table: unknown) => {
          const real = target.update(table as typeof events)
          if (table !== events) return real
          return {
            set: (values: never) => ({
              where: (cond: never) => ({
                returning: async (fields: never) => {
                  await target.update(users).set({ stripeChargesEnabled: false }).where(eq(users.id, orgA.id))
                  return real.set(values).where(cond).returning(fields)
                },
              }),
            }),
          }
        }
      },
    })
    await rejectsWith(setEventStatus(racing, orgA, id, "published"), OWN)
    expect((await statusOf(db, id)).status).toBe("draft")
  })
})

describe("featured", () => {
  const featuredOf = async (db: Awaited<ReturnType<typeof setup>>["db"], id: string) =>
    (await db.select().from(events).where(eq(events.id, id)))[0].featured

  it("lets admin and super_admin toggle a published event", async () => {
    const { db, orgA, admin, root, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, id, "published")
    await setEventFeatured(db, admin, id, true)
    expect(await featuredOf(db, id)).toBe(true)
    await setEventFeatured(db, root, id, false)
    expect(await featuredOf(db, id)).toBe(false)
  })

  it("denies organizer (owner), customer, null, suspended/deleted admin and bad ids", async () => {
    const { db, orgA, admin, customer, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, id, "published")
    await rejects(setEventFeatured(db, orgA, id, true))
    await rejects(setEventFeatured(db, customer, id, true))
    await rejects(setEventFeatured(db, null, id, true))
    await rejects(setEventFeatured(db, { ...admin, isSuspended: true }, id, true))
    await rejects(setEventFeatured(db, { ...admin, deletedAt: new Date() }, id, true))
    await rejects(setEventFeatured(db, admin, "nope", true))
    await rejects(setEventFeatured(db, admin, "7b0c2f3e-5a1d-4c8e-9f21-0a1b2c3d4e5f", true))
    expect(await featuredOf(db, id)).toBe(false)
  })

  it("refuses to feature a non-published event", async () => {
    const { db, orgA, admin, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await rejects(setEventFeatured(db, admin, id, true))
  })

  it("clears on cancel/suspend and does not restore on republish", async () => {
    const { db, orgA, admin, root, form } = await setup()
    const a = (await createEvent(db, orgA, form())).id
    const b = (await createEvent(db, orgA, form())).id
    for (const id of [a, b]) {
      await setEventStatus(db, orgA, id, "published")
      await setEventFeatured(db, admin, id, true)
    }
    await setEventStatus(db, orgA, a, "cancelled")
    await setEventStatus(db, root, b, "suspended")
    expect(await featuredOf(db, a)).toBe(false)
    expect(await featuredOf(db, b)).toBe(false)
    await setEventStatus(db, root, b, "published")
    expect(await featuredOf(db, b)).toBe(false)
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

describe("review findings", () => {
  it("refuses a past date when editing a published event but allows it on a draft", async () => {
    const { db, orgA, form } = await setup()
    const past = form({
      functions: [{ startsAt: "2000-01-01T10:00", zones: [{ name: "Gg", price: 1 }] }],
    })
    const { id } = await createEvent(db, orgA, form())
    const venueId = (await db.select().from(events).where(eq(events.id, id)))[0].venueId
    const withVenue = { ...past, venue: { mode: "existing" as const, venueId } }

    await updateEvent(db, orgA, id, withVenue)
    await setEventStatus(db, orgA, id, "cancelled").catch(() => undefined)

    const { id: published } = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, published, "published")
    const publishedVenue = (await db.select().from(events).where(eq(events.id, published)))[0].venueId
    await rejects(
      updateEvent(db, orgA, published, { ...past, venue: { mode: "existing", venueId: publishedVenue } }),
    )
  })

  it("does not let a stale cancel overwrite a concurrent suspension", async () => {
    const { db, orgA, admin, form } = await setup()
    const { id } = await createEvent(db, orgA, form())
    await setEventStatus(db, orgA, id, "published")

    const results = await Promise.allSettled([
      setEventStatus(db, orgA, id, "cancelled"),
      setEventStatus(db, admin, id, "suspended"),
    ])

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const [event] = await db.select().from(events).where(eq(events.id, id))
    expect(["cancelled", "suspended"]).toContain(event.status)
  })
})
