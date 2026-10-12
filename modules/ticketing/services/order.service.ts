import { and, asc, eq, inArray, lte } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { functionZones, orderItemSeats, orderItems, orders, tickets, venueZones } from "@/lib/db/schema";
import { MAX_TICKETS_PER_ZONE } from "@/modules/events/services/venue-zone.service";
import type { SeatRef } from "../types/seat.types";
import { getZoneAvailability } from "./get-zone-availability.service";

export const ORDER_TTL_MS = 15 * 60 * 1000;

export class InsufficientStockError extends Error {
  constructor(public readonly functionZoneId: string) {
    super(`not enough tickets available for function_zone ${functionZoneId}`);
    this.name = "InsufficientStockError";
  }
}

export class SeatTakenError extends Error {
  constructor(public readonly functionZoneId: string) {
    super(`seat already taken in function_zone ${functionZoneId}`);
    this.name = "SeatTakenError";
  }
}

export class InvalidOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderError";
  }
}

export type PendingOrderInput = {
  customerId: string;
  items: { functionZoneId: string; quantity?: number; seats?: SeatRef[] }[];
};

export async function createPendingOrder(db: Db, input: PendingOrderInput) {
  const requested = new Map<string, { quantity: number; seats: SeatRef[] }>();
  for (const { functionZoneId, quantity, seats } of input.items) {
    const entry = requested.get(functionZoneId) ?? { quantity: 0, seats: [] };
    entry.quantity += quantity ?? 0;
    entry.seats.push(...(seats ?? []));
    requested.set(functionZoneId, entry);
  }
  const zoneIds = [...requested.keys()].sort();

  return db.transaction(async (tx) => {
    const zones = await tx
      .select({
        id: functionZones.id,
        price: functionZones.price,
        currency: functionZones.currency,
        seatRows: venueZones.seatRows,
        seatColumns: venueZones.seatColumns,
      })
      .from(functionZones)
      .innerJoin(venueZones, eq(venueZones.id, functionZones.venueZoneId))
      .where(inArray(functionZones.id, zoneIds))
      .orderBy(asc(functionZones.id))
      .for("update", { of: functionZones });

    if (zones.length !== zoneIds.length) {
      throw new InvalidOrderError("function_zone not found");
    }

    // Validate against each zone's layout before writing anything.
    const numberedIds: string[] = [];
    for (const zone of zones) {
      const entry = requested.get(zone.id)!;
      if (zone.seatRows === null || zone.seatColumns === null) {
        if (entry.seats.length > 0) throw new InvalidOrderError("seats not allowed in a standing zone");
        if (entry.quantity < 1) throw new InvalidOrderError("quantity required for a standing zone");
        continue;
      }
      numberedIds.push(zone.id);
      const { seats } = entry;
      if (seats.length < 1 || entry.quantity > 0) throw new InvalidOrderError("seats required for a numbered zone");
      if (seats.length > MAX_TICKETS_PER_ZONE) throw new InvalidOrderError("too many seats for one zone");
      if (new Set(seats.map((s) => `${s.row}:${s.number}`)).size !== seats.length) {
        throw new InvalidOrderError("duplicate seats in order");
      }
      for (const s of seats) {
        const valid =
          Number.isInteger(s.row) &&
          Number.isInteger(s.number) &&
          s.row >= 1 &&
          s.number >= 1 &&
          s.row <= zone.seatRows &&
          s.number <= zone.seatColumns;
        if (!valid) throw new InvalidOrderError("seat out of range");
      }
      entry.quantity = seats.length;
    }

    if (numberedIds.length > 0) await releaseDeadSeats(tx as unknown as Db, numberedIds);

    for (const zone of zones) {
      const available = await getZoneAvailability(tx as unknown as Db, zone.id);
      if (available < requested.get(zone.id)!.quantity) throw new InsufficientStockError(zone.id);
    }

    const currency = zones[0].currency;
    if (zones.some((z) => z.currency !== currency)) {
      throw new InvalidOrderError("mixed currencies in one order");
    }

    // cents as integers to avoid float drift
    const totalCents = zones.reduce(
      (sum, z) => sum + Math.round(Number(z.price) * 100) * requested.get(z.id)!.quantity,
      0,
    );

    const [order] = await tx
      .insert(orders)
      .values({
        customerId: input.customerId,
        status: "pending",
        totalAmount: (totalCents / 100).toFixed(2),
        currency,
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
      })
      .returning();

    const items = await tx
      .insert(orderItems)
      .values(
        zones.map((z) => ({
          orderId: order.id,
          functionZoneId: z.id,
          quantity: requested.get(z.id)!.quantity,
          unitPrice: z.price,
        })),
      )
      .returning();

    for (const item of items) {
      const { seats } = requested.get(item.functionZoneId)!;
      if (seats.length === 0) continue;
      const inserted = await tx
        .insert(orderItemSeats)
        .values(
          seats.map((s) => ({
            orderItemId: item.id,
            functionZoneId: item.functionZoneId,
            seatRow: s.row,
            seatNumber: s.number,
          })),
        )
        .onConflictDoNothing()
        .returning();
      // The UNIQUE constraint is the last line of defense if the zone lock ever fails.
      if (inserted.length !== seats.length) throw new SeatTakenError(item.functionZoneId);
    }

    return { order, items };
  });
}

// Lazy sweep: expire stale pending orders holding seats in these zones, then free the
// seats of every expired/cancelled order so the UNIQUE never depends on order status.
async function releaseDeadSeats(tx: Db, zoneIds: string[]) {
  const holders = tx
    .select({ id: orderItems.orderId })
    .from(orderItemSeats)
    .innerJoin(orderItems, eq(orderItems.id, orderItemSeats.orderItemId))
    .where(inArray(orderItemSeats.functionZoneId, zoneIds));
  await tx
    .update(orders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(orders.status, "pending"), lte(orders.expiresAt, new Date()), inArray(orders.id, holders)));

  const deadItems = tx
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(inArray(orders.status, ["expired", "cancelled"]));
  await tx
    .delete(orderItemSeats)
    .where(and(inArray(orderItemSeats.functionZoneId, zoneIds), inArray(orderItemSeats.orderItemId, deadItems)));
}

export async function attachCheckoutSession(db: Db, orderId: string, sessionId: string) {
  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

export async function markOrderPaid(db: Db, input: { orderId: string; paymentIntentId: string }) {
  return db.transaction(async (tx) => {
    const [paid] = await tx
      .update(orders)
      .set({ status: "paid", stripePaymentIntentId: input.paymentIntentId, updatedAt: new Date() })
      .where(and(eq(orders.id, input.orderId), eq(orders.status, "pending")))
      .returning();

    if (!paid) return { updated: false };

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
    const seats =
      items.length > 0
        ? await tx
            .select({ id: orderItemSeats.id, orderItemId: orderItemSeats.orderItemId })
            .from(orderItemSeats)
            .where(inArray(orderItemSeats.orderItemId, items.map((i) => i.id)))
        : [];
    const rows = items.flatMap((item) => {
      const itemSeats = seats.filter((s) => s.orderItemId === item.id);
      if (itemSeats.length > 0) {
        return itemSeats.map((s) => ({ orderItemId: item.id, orderItemSeatId: s.id, qrCode: crypto.randomUUID() }));
      }
      return Array.from({ length: item.quantity }, () => ({ orderItemId: item.id, qrCode: crypto.randomUUID() }));
    });
    if (rows.length > 0) await tx.insert(tickets).values(rows);

    return { updated: true };
  });
}

export async function markOrderExpired(db: Db, orderId: string) {
  await db.transaction(async (tx) => {
    const [expired] = await tx
      .update(orders)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning();
    if (!expired) return;
    await tx.delete(orderItemSeats).where(
      inArray(
        orderItemSeats.orderItemId,
        tx.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, orderId)),
      ),
    );
  });
}

export async function setOrderInvoiceUrl(db: Db, orderId: string, url: string) {
  await db.update(orders).set({ invoiceUrl: url, updatedAt: new Date() }).where(eq(orders.id, orderId));
}
