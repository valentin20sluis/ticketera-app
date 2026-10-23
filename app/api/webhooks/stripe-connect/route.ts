import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";
import { syncConnectAccount } from "@/modules/payments/services/stripe-connect.service";

const HANDLED_TYPE = "v2.core.account[configuration.recipient].capability_status_updated";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let notification: ReturnType<typeof stripe.parseEventNotification>;
  try {
    // Thin event: la firma se verifica sobre el cuerpo crudo, no sobre JSON parseado.
    notification = stripe.parseEventNotification(
      await request.text(),
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Los errores no controlados propagan 500 para que Stripe reintente.
  if (notification.type === HANDLED_TYPE) {
    await syncConnectAccount(await getDb(), stripe, notification.related_object.id);
  }

  return new Response("ok", { status: 200 });
}
