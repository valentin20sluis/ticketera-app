import { and, eq, gt, or, sql } from "drizzle-orm";
import { functionZones, orderItems, orders } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

export async function getZoneAvailability(db: Db, functionZoneId: string): Promise<number> {
  const [zone] = await db
    .select({ capacity: functionZones.capacity })
    .from(functionZones)
    .where(eq(functionZones.id, functionZoneId));

  if (!zone) {
    throw new Error(`function_zone ${functionZoneId} not found`);
  }

  const [{ reserved }] = await db
    .select({ reserved: sql<number>`coalesce(sum(${orderItems.quantity}), 0)` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orderItems.functionZoneId, functionZoneId),
        or(eq(orders.status, "paid"), and(eq(orders.status, "pending"), gt(orders.expiresAt, new Date()))),
      ),
    );

  return zone.capacity - Number(reserved);
}
