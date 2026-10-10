import { NextResponse, type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { eventFunctions, events, functionZones, venueZones } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { checkoutSessionSchema } from "@/modules/checkout/schemas/checkout-session.schema";
import { createCheckoutSession } from "@/modules/checkout/services/create-checkout-session.service";
import {
  attachCheckoutSession,
  createPendingOrder,
  InsufficientStockError,
} from "@/modules/ticketing/services/order.service";
import { getCurrentUser } from "@/modules/users/services/current-user.service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.isSuspended) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = checkoutSessionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const db = await getDb();
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
      slug: events.slug,
    })
    .from(functionZones)
    .innerJoin(venueZones, eq(venueZones.id, functionZones.venueZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .where(inArray(functionZones.id, items.map((i) => i.functionZoneId)));
  const labelById = new Map(labels.map((l) => [l.id, l]));

  const origin = request.nextUrl.origin;
  const slug = labelById.get(items[0].functionZoneId)?.slug;

  const session = await createCheckoutSession(stripe, {
    orderId: order.id,
    expiresAt: order.expiresAt,
    successUrl: `${origin}/mis-entradas`,
    cancelUrl: slug ? `${origin}/eventos/${slug}/entradas` : `${origin}/eventos`,
    items: items.map((item) => {
      const label = labelById.get(item.functionZoneId);
      return {
        name: label ? `${label.title} - ${label.zone}` : "Entrada",
        unitAmount: Number(item.unitPrice),
        quantity: item.quantity,
      };
    }),
  });

  await attachCheckoutSession(db, order.id, session.id);
  return NextResponse.json({ url: session.url });
}
