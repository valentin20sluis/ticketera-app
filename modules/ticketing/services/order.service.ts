import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { functionZones, orderItems, orders, tickets } from "@/lib/db/schema";
import { getZoneAvailability } from "./get-zone-availability.service";

export const ORDER_TTL_MS = 15 * 60 * 1000;

export class InsufficientStockError extends Error {
  constructor(public readonly functionZoneId: string) {
    super(`not enough tickets available for function_zone ${functionZoneId}`);
    this.name = "InsufficientStockError";
  }
}

export type PendingOrderInput = {
  customerId: string;
  items: { functionZoneId: string; quantity: number }[];
};

export async function createPendingOrder(db: Db, input: PendingOrderInput) {
  const requested = new Map<string, number>();
  for (const { functionZoneId, quantity } of input.items) {
    requested.set(functionZoneId, (requested.get(functionZoneId) ?? 0) + quantity);
  }
  const zoneIds = [...requested.keys()].sort();

  return db.transaction(async (tx) => {
    const zones = await tx
      .select({ id: functionZones.id, price: functionZones.price, currency: functionZones.currency })
      .from(functionZones)
      .where(inArray(functionZones.id, zoneIds))
      .orderBy(asc(functionZones.id))
      .for("update");

    if (zones.length !== zoneIds.length) {
      throw new Error("function_zone not found");
    }

    for (const zone of zones) {
      const available = await getZoneAvailability(tx as unknown as Db, zone.id);
      if (available < requested.get(zone.id)!) throw new InsufficientStockError(zone.id);
    }

    const currency = zones[0].currency;
    if (zones.some((z) => z.currency !== currency)) {
      throw new Error("mixed currencies in one order");
    }

    // cents as integers to avoid float drift
    const totalCents = zones.reduce(
      (sum, z) => sum + Math.round(Number(z.price) * 100) * requested.get(z.id)!,
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
          quantity: requested.get(z.id)!,
          unitPrice: z.price,
        })),
      )
      .returning();

    return { order, items };
  });
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
    const rows = items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        orderItemId: item.id,
        qrCode: crypto.randomUUID(),
      })),
    );
    if (rows.length > 0) await tx.insert(tickets).values(rows);

    return { updated: true };
  });
}

export async function markOrderExpired(db: Db, orderId: string) {
  await db
    .update(orders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

export async function setOrderInvoiceUrl(db: Db, orderId: string, url: string) {
  await db.update(orders).set({ invoiceUrl: url, updatedAt: new Date() }).where(eq(orders.id, orderId));
}
