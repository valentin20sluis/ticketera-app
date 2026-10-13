import { and, eq, isNull, sql } from "drizzle-orm"
import type { Db } from "@/lib/db/client"
import { eventStatusEnum, events, orderItems, orders, userRoleEnum, users } from "@/lib/db/schema"
import { calculatePlatformFee, InvalidPlatformFeeError } from "@/modules/payments/utils/platform-fee"
import type { UserRole } from "@/modules/users/types/user.types"

export type EventStatus = (typeof eventStatusEnum.enumValues)[number]

export interface PlatformSummary {
  usersByRole: Record<UserRole, number>
  activeOrganizers: number
  eventsByStatus: Record<EventStatus, number>
  ticketsSold: number
  /** Soles, paid orders only. */
  grossRevenue: number
  /** Soles; null when feePercent is missing/invalid ("not available"). */
  platformFee: number | null
}

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>
}

// Only orders.status = "paid" count. The fee is not persisted: it is recomputed per
// paid order in cents, exactly like createCheckoutSession, then summed.
export async function getPlatformSummary(db: Db, feePercent: number | null): Promise<PlatformSummary> {
  const [roleRows, eventRows, [organizers], [tickets], paidOrders] = await Promise.all([
    db
      .select({ key: users.role, value: sql<string>`count(*)` })
      .from(users)
      .where(isNull(users.deletedAt))
      .groupBy(users.role),
    db.select({ key: events.status, value: sql<string>`count(*)` }).from(events).groupBy(events.status),
    db
      .select({ value: sql<string>`count(distinct ${users.id})` })
      .from(users)
      .innerJoin(events, eq(events.organizerId, users.id))
      .where(
        and(
          eq(users.role, "organizer"),
          eq(users.isSuspended, false),
          isNull(users.deletedAt),
          eq(events.status, "published"),
        ),
      ),
    db
      .select({ value: sql<string>`coalesce(sum(${orderItems.quantity}), 0)` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orders.status, "paid")),
    db.select({ total: orders.totalAmount }).from(orders).where(eq(orders.status, "paid")),
  ])

  const usersByRole = zeroed(userRoleEnum.enumValues)
  for (const row of roleRows) usersByRole[row.key] = Number(row.value)
  const eventsByStatus = zeroed(eventStatusEnum.enumValues)
  for (const row of eventRows) eventsByStatus[row.key] = Number(row.value)

  const totalsMinor = paidOrders.map((order) => Math.round(Number(order.total) * 100))
  let platformFee: number | null = null
  if (feePercent !== null) {
    try {
      platformFee = totalsMinor.reduce((sum, minor) => sum + calculatePlatformFee(minor, feePercent), 0) / 100
    } catch (error) {
      if (!(error instanceof InvalidPlatformFeeError)) throw error
    }
  }

  return {
    usersByRole,
    activeOrganizers: Number(organizers.value),
    eventsByStatus,
    ticketsSold: Number(tickets.value),
    grossRevenue: totalsMinor.reduce((sum, minor) => sum + minor, 0) / 100,
    platformFee,
  }
}
