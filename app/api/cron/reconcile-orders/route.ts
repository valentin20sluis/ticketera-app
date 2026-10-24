import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";
import { reconcilePendingOrders } from "@/modules/ticketing/services/reconcile-orders.service";

export const maxDuration = 60;

function isAuthorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return Response.json({ error: "Cron not configured" }, { status: 500 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await reconcilePendingOrders(await getDb(), stripe);
    console.log(JSON.stringify({ job: "reconcile-orders", ...summary }));
    return Response.json(summary);
  } catch (error) {
    console.error("reconcile-orders failed", error);
    return Response.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
