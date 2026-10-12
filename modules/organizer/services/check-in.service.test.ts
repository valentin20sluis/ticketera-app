import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  users,
  venues,
  venueZones,
} from "@/lib/db/schema";
import { checkInTicket, CheckInError, getCheckInStats, listCheckInEvents } from "./check-in.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;
type EventStatus = (typeof events.$inferSelect)["status"];
type OrderStatus = (typeof orders.$inferSelect)["status"];

const TIMEOUT = 60_000;
let db: TestDb;
let seq = 0;
let categoryId: string;
let a: typeof users.$inferSelect;
let b: typeof users.$inferSelect;
let admin: typeof users.$inferSelect;
let customer: typeof users.$inferSelect;

const actorOf = (u: typeof users.$inferSelect) => ({
  id: u.id,
  role: u.role,
  isSuspended: u.isSuspended,
  deletedAt: u.deletedAt,
});

beforeAll(async () => {
  db = await createTestDb();
  [a, b, admin, customer] = await db
    .insert(users)
    .values([
      { clerkUserId: "c_a", email: "a@example.com", fullName: "Org A", role: "organizer" },
      { clerkUserId: "c_b", email: "b@example.com", fullName: "Org B", role: "organizer" },
      { clerkUserId: "c_admin", email: "admin@example.com", fullName: "Admin", role: "admin" },
      { clerkUserId: "c_cust", email: "cust@example.com", fullName: "Cust", role: "customer" },
    ])
    .returning();
  [{ id: categoryId }] = await db
    .insert(eventCategories)
    .values({ name: "Music", iconKey: "music", colorKey: "red" })
    .returning({ id: eventCategories.id });
}, TIMEOUT);

// Each test builds its own event(s) so assertions never depend on other tests' data.
async function makeEvent(organizer: typeof users.$inferSelect, status: EventStatus = "published") {
  const n = ++seq;
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: organizer.id, name: `V${n}`, address: "x", city: "Lima", lat: 0, lng: 0 })
    .returning();
  const [zone] = await db
    .insert(venueZones)
    .values({ venueId: venue.id, name: `Zona ${n}`, shapeX: 0, shapeY: 0, shapeWidth: 1, shapeHeight: 1, capacity: 100 })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      organizerId: organizer.id,
      categoryId,
      venueId: venue.id,
      slug: `e-${n}`,
      title: `Evento ${n}`,
      description: "d",
      imageUrl: "i",
      doorsOpenTime: "18:00",
      showStartTime: "19:00",
      minimumAge: "0",
      admissionType: "general",
      status,
    })
    .returning();
  const addFunction = async (startsAt: Date) => {
    const [fn] = await db.insert(eventFunctions).values({ eventId: event.id, startsAt }).returning();
    const [fz] = await db
      .insert(functionZones)
      .values({ functionId: fn.id, venueZoneId: zone.id, price: "10.00", capacity: 100 })
      .returning();
    return fz;
  };
  const fz = await addFunction(new Date("2030-01-01T01:00:00Z"));
  return { event, zone, fz, addFunction };
}

async function makeTicket(functionZoneId: string, orderStatus: OrderStatus = "paid", quantity = 1) {
  const [order] = await db
    .insert(orders)
    .values({ customerId: customer.id, status: orderStatus, totalAmount: "10.00", expiresAt: new Date() })
    .returning();
  const [item] = await db
    .insert(orderItems)
    .values({ orderId: order.id, functionZoneId, quantity, unitPrice: "10.00" })
    .returning();
  const rows = await db
    .insert(tickets)
    .values(Array.from({ length: quantity }, () => ({ orderItemId: item.id, qrCode: crypto.randomUUID() })))
    .returning();
  return rows[0];
}

const ticketRow = async (id: string) => (await db.select().from(tickets).where(eq(tickets.id, id)))[0];

describe("checkInTicket", () => {
  it("admits a valid ticket and persists used + checked_in_at", async () => {
    const { event, fz, zone } = await makeEvent(a);
    const t = await makeTicket(fz.id);

    const { result, stats } = await checkInTicket(db, actorOf(a), { eventId: event.id, code: t.qrCode });

    const row = await ticketRow(t.id);
    expect(row.status).toBe("used");
    expect(row.checkedInAt).toBeInstanceOf(Date);
    expect(result).toEqual({
      status: "admitted",
      checkedInAt: row.checkedInAt!.toISOString(),
      zoneName: zone.name,
      functionStartsAt: "2030-01-01T01:00:00.000Z",
    });
    expect(stats).toEqual({ sold: 1, entered: 1 });
  }, TIMEOUT);

  it("normalizes the code (case, spaces, line breaks)", async () => {
    const { event, fz } = await makeEvent(a);
    const t = await makeTicket(fz.id);
    const messy = `  ${t.qrCode.toUpperCase().slice(0, 10)} \n${t.qrCode.toUpperCase().slice(10)}\n`;

    const { result } = await checkInTicket(db, actorOf(a), { eventId: event.id, code: messy });

    expect(result.status).toBe("admitted");
  }, TIMEOUT);

  it("returns already_used and keeps the original checked_in_at", async () => {
    const { event, fz, zone } = await makeEvent(a);
    const t = await makeTicket(fz.id);
    await checkInTicket(db, actorOf(a), { eventId: event.id, code: t.qrCode });
    const first = (await ticketRow(t.id)).checkedInAt!;

    const { result, stats } = await checkInTicket(db, actorOf(a), { eventId: event.id, code: t.qrCode });

    expect(result).toEqual({ status: "already_used", checkedInAt: first.toISOString(), zoneName: zone.name });
    expect((await ticketRow(t.id)).checkedInAt).toEqual(first);
    expect(stats.entered).toBe(1);
  }, TIMEOUT);

  // PGlite serializes on a single connection: this proves the `status = 'valid'` guard in the
  // UPDATE, not Postgres row locking.
  it("admits exactly one of several simultaneous check-ins", async () => {
    const { event, fz } = await makeEvent(a);
    const t = await makeTicket(fz.id);

    const outcomes = await Promise.all(
      Array.from({ length: 4 }, () => checkInTicket(db, actorOf(a), { eventId: event.id, code: t.qrCode })),
    );

    const statuses = outcomes.map((o) => o.result.status).sort();
    expect(statuses).toEqual(["admitted", "already_used", "already_used", "already_used"]);
    const admitted = outcomes.find((o) => o.result.status === "admitted")!.result;
    expect((await ticketRow(t.id)).checkedInAt!.toISOString()).toBe(
      (admitted as { checkedInAt: string }).checkedInAt,
    );
    expect((await getCheckInStats(db, actorOf(a), event.id)).entered).toBe(1);
  }, TIMEOUT);

  it("wrong_event: own ticket of another event, with its title, unchanged", async () => {
    const one = await makeEvent(a);
    const two = await makeEvent(a);
    const t = await makeTicket(two.fz.id);

    const { result } = await checkInTicket(db, actorOf(a), { eventId: one.event.id, code: t.qrCode });

    expect(result).toEqual({ status: "wrong_event", ticketEventTitle: two.event.title });
    expect((await ticketRow(t.id)).status).toBe("valid");
  }, TIMEOUT);

  it("foreign: other organizer's ticket leaks nothing and is unchanged", async () => {
    const mine = await makeEvent(a);
    const theirs = await makeEvent(b);
    const t = await makeTicket(theirs.fz.id);

    const { result } = await checkInTicket(db, actorOf(a), { eventId: mine.event.id, code: t.qrCode });

    expect(result).toStrictEqual({ status: "foreign" });
    expect((await ticketRow(t.id)).status).toBe("valid");
  }, TIMEOUT);

  it("admin admits another organizer's ticket of the selected event", async () => {
    const theirs = await makeEvent(b);
    const t = await makeTicket(theirs.fz.id);

    const { result } = await checkInTicket(db, actorOf(admin), { eventId: theirs.event.id, code: t.qrCode });

    expect(result.status).toBe("admitted");
  }, TIMEOUT);

  it.each(["pending", "expired", "cancelled"] as const)("unpaid: %s order", async (orderStatus) => {
    const { event, fz } = await makeEvent(a);
    const t = await makeTicket(fz.id, orderStatus);

    const { result, stats } = await checkInTicket(db, actorOf(a), { eventId: event.id, code: t.qrCode });

    expect(result).toEqual({ status: "unpaid" });
    expect((await ticketRow(t.id)).status).toBe("valid");
    expect(stats).toEqual({ sold: 0, entered: 0 });
  }, TIMEOUT);

  it.each(["draft", "cancelled", "suspended"] as const)("event_unavailable: %s event", async (status) => {
    const { event, fz } = await makeEvent(a, status);
    const t = await makeTicket(fz.id);

    const { result } = await checkInTicket(db, actorOf(a), { eventId: event.id, code: t.qrCode });

    expect(result).toEqual({ status: "event_unavailable" });
    expect((await ticketRow(t.id)).status).toBe("valid");
  }, TIMEOUT);

  it("not_found for a well-formed unknown UUID", async () => {
    const { event } = await makeEvent(a);
    const { result } = await checkInTicket(db, actorOf(a), { eventId: event.id, code: crypto.randomUUID() });
    expect(result).toEqual({ status: "not_found" });
  }, TIMEOUT);

  it.each(["", "   ", "TICKETERA-123-1", "3F2B8C1E", "x".repeat(300)])("invalid for %j", async (code) => {
    const { event } = await makeEvent(a);
    const { result } = await checkInTicket(db, actorOf(a), { eventId: event.id, code });
    expect(result).toEqual({ status: "invalid" });
  }, TIMEOUT);

  it("rejects unauthorized actors and out-of-scope events with CheckInError", async () => {
    const mine = await makeEvent(a);
    const theirs = await makeEvent(b);
    const input = { eventId: mine.event.id, code: crypto.randomUUID() };

    await expect(checkInTicket(db, null, input)).rejects.toBeInstanceOf(CheckInError);
    await expect(checkInTicket(db, actorOf(customer), input)).rejects.toBeInstanceOf(CheckInError);
    await expect(
      checkInTicket(db, { ...actorOf(a), isSuspended: true }, input),
    ).rejects.toBeInstanceOf(CheckInError);
    await expect(
      checkInTicket(db, { ...actorOf(a), deletedAt: new Date() }, input),
    ).rejects.toBeInstanceOf(CheckInError);
    await expect(
      checkInTicket(db, actorOf(a), { ...input, eventId: theirs.event.id }),
    ).rejects.toBeInstanceOf(CheckInError);
    await expect(
      checkInTicket(db, actorOf(a), { ...input, eventId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(CheckInError);
  }, TIMEOUT);
});

describe("stats and listing", () => {
  it("sold counts only paid orders across functions; entered only used", async () => {
    const { event, fz, addFunction } = await makeEvent(a);
    const fz2 = await addFunction(new Date("2030-02-01T01:00:00Z"));
    const t1 = await makeTicket(fz.id, "paid", 2);
    await makeTicket(fz2.id, "paid", 3);
    await makeTicket(fz.id, "pending", 4);
    await makeTicket(fz.id, "expired");
    await makeTicket(fz.id, "cancelled");

    expect(await getCheckInStats(db, actorOf(a), event.id)).toEqual({ sold: 5, entered: 0 });
    await checkInTicket(db, actorOf(a), { eventId: event.id, code: t1.qrCode });
    expect(await getCheckInStats(db, actorOf(a), event.id)).toEqual({ sold: 5, entered: 1 });
  }, TIMEOUT);

  it("returns zeros for an event without sales", async () => {
    const { event } = await makeEvent(a);
    expect(await getCheckInStats(db, actorOf(a), event.id)).toEqual({ sold: 0, entered: 0 });
  }, TIMEOUT);

  it("getCheckInStats throws CheckInError for an event outside the scope", async () => {
    const theirs = await makeEvent(b);
    await expect(getCheckInStats(db, actorOf(a), theirs.event.id)).rejects.toBeInstanceOf(CheckInError);
    await expect(getCheckInStats(db, actorOf(customer), theirs.event.id)).rejects.toBeInstanceOf(CheckInError);
  }, TIMEOUT);

  it("listCheckInEvents: only published, own for organizer, all for admin, with stats", async () => {
    const pub = await makeEvent(a);
    const draft = await makeEvent(a, "draft");
    const other = await makeEvent(b);
    await makeTicket(pub.fz.id, "paid", 2);

    const own = await listCheckInEvents(db, actorOf(a));
    const ids = own.map((e) => e.id);
    expect(ids).toContain(pub.event.id);
    expect(ids).not.toContain(draft.event.id);
    expect(ids).not.toContain(other.event.id);
    expect(own.every((e) => e.status === "published")).toBe(true);
    expect(own.find((e) => e.id === pub.event.id)).toMatchObject({ sold: 2, entered: 0 });

    const all = (await listCheckInEvents(db, actorOf(admin))).map((e) => e.id);
    expect(all).toEqual(expect.arrayContaining([pub.event.id, other.event.id]));
    expect(all).not.toContain(draft.event.id);

    await expect(listCheckInEvents(db, actorOf(customer))).rejects.toBeInstanceOf(CheckInError);
    await expect(listCheckInEvents(db, null)).rejects.toBeInstanceOf(CheckInError);
  }, TIMEOUT);
});
