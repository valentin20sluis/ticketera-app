import { and, asc, eq, lte } from "drizzle-orm";
import type StripeClient from "stripe";
import type { Db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { markOrderExpired, markOrderPaid } from "./order.service";

export const RECONCILE_GRACE_MS = 2 * 60 * 1000;
export const RECONCILE_BATCH_SIZE = 50;

export interface ReconcileSummary {
  scanned: number;
  paid: number;
  expired: number;
  closedOpen: number;
  alreadyProcessed: number;
  skipped: number;
  errors: number;
}

export type StripeLike = {
  checkout: { sessions: Pick<StripeClient["checkout"]["sessions"], "retrieve" | "expire"> };
};

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id);

export async function reconcilePendingOrders(
  db: Db,
  stripe: StripeLike,
  now: Date = new Date(),
): Promise<ReconcileSummary> {
  const candidates = await db
    .select({ id: orders.id, sessionId: orders.stripeCheckoutSessionId })
    .from(orders)
    .where(and(eq(orders.status, "pending"), lte(orders.expiresAt, new Date(now.getTime() - RECONCILE_GRACE_MS))))
    .orderBy(asc(orders.expiresAt))
    .limit(RECONCILE_BATCH_SIZE);

  const summary: ReconcileSummary = {
    scanned: candidates.length,
    paid: 0,
    expired: 0,
    closedOpen: 0,
    alreadyProcessed: 0,
    skipped: 0,
    errors: 0,
  };

  for (const { id, sessionId } of candidates) {
    try {
      if (!sessionId) {
        await markOrderExpired(db, id);
        summary.expired++;
        continue;
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const paymentIntentId = idOf(session.payment_intent);
        if (!paymentIntentId) throw new Error("paid session without payment_intent");
        const { updated } = await markOrderPaid(db, { orderId: id, paymentIntentId });
        if (updated) summary.paid++;
        else summary.alreadyProcessed++;
      } else if (session.status === "expired") {
        await markOrderExpired(db, id);
        summary.expired++;
      } else if (session.status === "open") {
        await stripe.checkout.sessions.expire(sessionId);
        await markOrderExpired(db, id);
        summary.closedOpen++;
      } else {
        summary.skipped++;
      }
    } catch (error) {
      summary.errors++;
      console.error("reconcile-orders: failed to reconcile order", { orderId: id, error });
    }
  }

  return summary;
}
