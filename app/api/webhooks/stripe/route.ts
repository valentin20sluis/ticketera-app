import type { NextRequest } from "next/server";
import type { Stripe } from "stripe";
import { getDb } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";
import {
  markOrderExpired,
  markOrderPaid,
  setOrderInvoiceUrl,
} from "@/modules/ticketing/services/order.service";

const idOf = (ref: string | { id: string } | null | undefined) =>
  typeof ref === "string" ? ref : ref?.id;

// La factura de Checkout no hereda metadata de la session: se llega a la orden
// vía invoice -> PaymentIntent -> Checkout Session.
async function resolveInvoiceOrderId(invoice: Stripe.Invoice) {
  if (invoice.metadata?.orderId) return invoice.metadata.orderId;
  if (!invoice.id) return undefined;

  const { data: payments } = await stripe.invoicePayments.list({ invoice: invoice.id });
  const paymentIntentId = idOf(payments[0]?.payment.payment_intent);
  if (!paymentIntentId) return undefined;

  const { data: sessions } = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  return sessions[0]?.metadata?.orderId;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // La firma se verifica sobre el cuerpo crudo, no sobre JSON parseado.
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Los errores no controlados propagan 500 para que Stripe reintente.
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentIntentId = idOf(session.payment_intent);
      if (session.payment_status === "paid" && orderId && paymentIntentId) {
        await markOrderPaid(await getDb(), { orderId, paymentIntentId });
      }
      break;
    }
    case "checkout.session.expired": {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) await markOrderExpired(await getDb(), orderId);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      if (!invoice.hosted_invoice_url) break;
      const orderId = await resolveInvoiceOrderId(invoice);
      if (orderId) await setOrderInvoiceUrl(await getDb(), orderId, invoice.hosted_invoice_url);
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
