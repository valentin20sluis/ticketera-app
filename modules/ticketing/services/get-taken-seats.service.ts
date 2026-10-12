import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { orderItemSeats, orderItems, orders } from "@/lib/db/schema";
import type { SeatRef } from "../types/seat.types";
import { reservingOrderCondition } from "./get-zone-availability.service";

// Seats held by paid or live pending orders (expired holds show as free before the lazy sweep).
export async function getTakenSeats(db: Db, functionZoneId: string): Promise<SeatRef[]> {
  return db
    .select({ row: orderItemSeats.seatRow, number: orderItemSeats.seatNumber })
    .from(orderItemSeats)
    .innerJoin(orderItems, eq(orderItems.id, orderItemSeats.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItemSeats.functionZoneId, functionZoneId), reservingOrderCondition()))
    .orderBy(asc(orderItemSeats.seatRow), asc(orderItemSeats.seatNumber));
}
