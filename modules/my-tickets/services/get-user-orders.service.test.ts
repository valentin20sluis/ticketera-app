import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { createTestDb } from "@/lib/db/test-helpers"
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  users,
  venueZones,
  venues,
} from "@/lib/db/schema"
import { buildTicketStubs } from "@/modules/checkout/utils/build-ticket-stubs"
import { getPaidOrdersForUser } from "./get-user-orders.service"

type TestDb = Awaited<ReturnType<typeof createTestDb>>

async function seedCatalog(db: TestDb) {
  const [organizer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "o@example.com", fullName: "O", role: "organizer" })
    .returning()
  const [category] = await db.insert(eventCategories).values({ name: "Música", iconKey: "music", colorKey: "indigo" }).returning()
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: organizer.id, name: "Estadio", address: "A", city: "Lima", lat: 0, lng: 0 })
    .returning()
  const [event] = await db
    .insert(events)
    .values({
      organizerId: organizer.id,
      categoryId: category.id,
      venueId: venue.id,
      slug: `e-${crypto.randomUUID()}`,
      title: "Concierto",
      description: "d",
      imageUrl: "https://picsum.photos/seed/e/800",
      doorsOpenTime: "19:00",
      showStartTime: "20:00",
      minimumAge: "18",
      admissionType: "General",
    })
    .returning()
  const startsAt = new Date("2026-12-01T20:00:00.000Z")
  const [fn] = await db.insert(eventFunctions).values({ eventId: event.id, startsAt }).returning()

  const zones = []
  for (const [name, price] of [["VIP", "100.00"], ["General", "50.00"]]) {
    const [vz] = await db
      .insert(venueZones)
      .values({ venueId: venue.id, name, shapeX: 0, shapeY: 0, shapeWidth: 1, shapeHeight: 1, capacity: 100 })
      .returning()
    const [fz] = await db
      .insert(functionZones)
      .values({ functionId: fn.id, venueZoneId: vz.id, price, capacity: 100 })
      .returning()
    zones.push(fz)
  }
  return { zones, startsAt }
}

async function newUser(db: TestDb) {
  const [u] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "c@example.com", fullName: "C" })
    .returning()
  return u
}

async function placeOrder(
  db: TestDb,
  customerId: string,
  status: "pending" | "paid" | "expired" | "cancelled",
  items: { functionZoneId: string; quantity: number; unitPrice: string }[],
  opts: { createdAt?: Date; invoiceUrl?: string } = {},
) {
  const total = items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0).toFixed(2)
  const [order] = await db
    .insert(orders)
    .values({ customerId, status, totalAmount: total, expiresAt: new Date(), ...opts })
    .returning()
  const qrs: string[][] = []
  for (const item of items) {
    const [row] = await db.insert(orderItems).values({ orderId: order.id, ...item }).returning()
    const codes = Array.from({ length: item.quantity }, () => `qr-${crypto.randomUUID()}`)
    await db.insert(tickets).values(codes.map((qrCode) => ({ orderItemId: row.id, qrCode })))
    qrs.push(codes)
  }
  return { order, qrs }
}

describe("getPaidOrdersForUser", () => {
  it("returns only paid orders of the given user", async () => {
    const db = await createTestDb()
    const { zones } = await seedCatalog(db)
    const me = await newUser(db)
    const other = await newUser(db)
    const item = [{ functionZoneId: zones[0].id, quantity: 1, unitPrice: "100.00" }]
    const { order } = await placeOrder(db, me.id, "paid", item)
    await placeOrder(db, me.id, "pending", item)
    await placeOrder(db, me.id, "expired", item)
    await placeOrder(db, me.id, "cancelled", item)
    await placeOrder(db, other.id, "paid", item)

    const result = await getPaidOrdersForUser(db, me.id)

    expect(result).toHaveLength(1)
    expect(result[0].orderNumber).toBe(`TKT-${order.id.slice(0, 8).toUpperCase()}`)
  })

  it("orders from newest to oldest", async () => {
    const db = await createTestDb()
    const { zones } = await seedCatalog(db)
    const me = await newUser(db)
    const item = [{ functionZoneId: zones[0].id, quantity: 1, unitPrice: "100.00" }]
    const old = await placeOrder(db, me.id, "paid", item, { createdAt: new Date("2026-01-01") })
    const recent = await placeOrder(db, me.id, "paid", item, { createdAt: new Date("2026-06-01") })

    const result = await getPaidOrdersForUser(db, me.id)

    expect(result.map((o) => o.orderNumber)).toEqual([
      `TKT-${recent.order.id.slice(0, 8).toUpperCase()}`,
      `TKT-${old.order.id.slice(0, 8).toUpperCase()}`,
    ])
  })

  it("maps event, lines, totals and invoiceUrl", async () => {
    const db = await createTestDb()
    const { zones, startsAt } = await seedCatalog(db)
    const me = await newUser(db)
    await placeOrder(
      db,
      me.id,
      "paid",
      [
        { functionZoneId: zones[0].id, quantity: 2, unitPrice: "100.00" },
        { functionZoneId: zones[1].id, quantity: 1, unitPrice: "50.00" },
      ],
      { invoiceUrl: "https://stripe.test/invoice" },
    )
    await placeOrder(db, me.id, "paid", [{ functionZoneId: zones[1].id, quantity: 1, unitPrice: "50.00" }], {
      createdAt: new Date("2020-01-01"),
    })

    const [withInvoice, withoutInvoice] = await getPaidOrdersForUser(db, me.id)

    expect(withInvoice).toMatchObject({
      eventTitle: "Concierto",
      venueName: "Estadio",
      city: "Lima",
      startDate: startsAt.toISOString(),
      totalQuantity: 3,
      totalAmount: 250,
      invoiceUrl: "https://stripe.test/invoice",
    })
    expect(withInvoice.lines).toHaveLength(2)
    expect(withInvoice.lines).toContainEqual({ zoneId: zones[0].id, zoneName: "VIP", price: 100, quantity: 2, subtotal: 200 })
    expect(withInvoice.lines).toContainEqual({ zoneId: zones[1].id, zoneName: "General", price: 50, quantity: 1, subtotal: 50 })
    expect(withoutInvoice.invoiceUrl).toBeUndefined()
  })

  it("orders lines of the same order by order_items.id", async () => {
    const db = await createTestDb()
    const { zones } = await seedCatalog(db)
    const me = await newUser(db)
    const { order } = await placeOrder(db, me.id, "paid", [
      { functionZoneId: zones[0].id, quantity: 1, unitPrice: "100.00" },
      { functionZoneId: zones[1].id, quantity: 1, unitPrice: "50.00" },
      { functionZoneId: zones[0].id, quantity: 2, unitPrice: "100.00" },
    ])
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const expected = items.sort((a, b) => (a.id < b.id ? -1 : 1)).map((i) => i.functionZoneId)

    const [result] = await getPaidOrdersForUser(db, me.id)

    expect(result.lines.map((l) => l.zoneId)).toEqual(expected)
  })

  it("aligns ticketQrCodes with buildTicketStubs numbering across lines", async () => {
    const db = await createTestDb()
    const { zones } = await seedCatalog(db)
    const me = await newUser(db)
    const { qrs } = await placeOrder(db, me.id, "paid", [
      { functionZoneId: zones[0].id, quantity: 2, unitPrice: "100.00" },
      { functionZoneId: zones[1].id, quantity: 3, unitPrice: "50.00" },
    ])
    const qrByZone = new Map([
      [zones[0].id, qrs[0]],
      [zones[1].id, qrs[1]],
    ])

    const [order] = await getPaidOrdersForUser(db, me.id)
    const stubs = buildTicketStubs(order.lines)

    expect(order.ticketQrCodes).toHaveLength(5)
    let n = 0
    for (const line of order.lines) {
      const expected = [...qrByZone.get(line.zoneId)!].sort()
      const got = order.ticketQrCodes!.slice(n, n + line.quantity)
      expect([...got].sort()).toEqual(expected)
      stubs.slice(n, n + line.quantity).forEach((s) => expect(s.zoneName).toBe(line.zoneName))
      n += line.quantity
    }
  })
})
