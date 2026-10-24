import { NextResponse, type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { eventFunctions, events, functionZones, venueZones } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { checkoutSessionSchema } from "@/modules/checkout/schemas/checkout-session.schema";
import { createCheckoutSession } from "@/modules/checkout/services/create-checkout-session.service";
import { resolveCheckoutDestination } from "@/modules/checkout/services/resolve-checkout-destination.service";
import { parsePlatformFeePercent } from "@/modules/payments/utils/platform-fee";
import {
  attachCheckoutSession,
  createPendingOrder,
  InsufficientStockError,
  markOrderExpired,
} from "@/modules/ticketing/services/order.service";
import { getCurrentUser } from "@/modules/users/services/current-user.service";

const DESTINATION_FAILURES = {
  zone_not_found: { error: "invalid_payload", status: 400 },
  multiple_events: { error: "multiple_events", status: 422 },
  organizer_payments_unavailable: { error: "organizer_payments_unavailable", status: 409 },
} as const;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.isSuspended) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = checkoutSessionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let feePercent: number;
  try {
    feePercent = parsePlatformFeePercent(process.env.PLATFORM_FEE_PERCENT);
  } catch (error) {
    console.error("Invalid PLATFORM_FEE_PERCENT", error);
    return NextResponse.json({ error: "payments_misconfigured" }, { status: 503 });
  }

  const db = await getDb();
  const destination = await resolveCheckoutDestination(
    db,
    body.data.items.map((i) => i.functionZoneId),
  );
  if (!destination.ok) {
    const { error, status } = DESTINATION_FAILURES[destination.error];
    return NextResponse.json({ error }, { status });
  }

  let created;
  try {
    created = await createPendingOrder(db, { customerId: user.id, items: body.data.items });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: "insufficient_stock" }, { status: 409 });
    }
    throw error;
  }
  const { order, items } = created;

  const labels = await db
    .select({
      id: functionZones.id,
      zone: venueZones.name,
      title: events.title,
    })
    .from(functionZones)
    .innerJoin(venueZones, eq(venueZones.id, functionZones.venueZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .where(inArray(functionZones.id, items.map((i) => i.functionZoneId)));
  const labelById = new Map(labels.map((l) => [l.id, l]));

  const origin = request.nextUrl.origin;

  let session;
  try {
    session = await createCheckoutSession(stripe, {
      orderId: order.id,
      expiresAt: order.expiresAt,
      successUrl: `${origin}/mis-entradas`,
      cancelUrl: `${origin}/eventos/${destination.eventSlug}/entradas`,
      destinationAccountId: destination.stripeAccountId,
      feePercent,
      items: items.map((item) => {
        const label = labelById.get(item.functionZoneId);
        return {
          name: label ? `${label.title} - ${label.zone}` : "Entrada",
          unitAmount: Number(item.unitPrice),
          quantity: item.quantity,
        };
      }),
    });
  } catch (error) {
    console.error("Checkout session creation failed", error);
    await markOrderExpired(db, order.id);
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 502 });
  }

  await attachCheckoutSession(db, order.id, session.id);
  return NextResponse.json({ url: session.url });
}
