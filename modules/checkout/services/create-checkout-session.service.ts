import type StripeClient from "stripe";

const MIN_EXPIRATION_SECONDS = 30 * 60;

export interface CheckoutItem {
  name: string;
  unitAmount: number;
  quantity: number;
}

export interface CreateCheckoutSessionInput {
  orderId: string;
  items: CheckoutItem[];
  expiresAt: Date;
  successUrl: string;
  cancelUrl: string;
}

function randomLetters(length: number) {
  return Array.from({ length }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join("");
}

export async function createCheckoutSession(
  stripe: StripeClient,
  { orderId, items, expiresAt, successUrl, cancelUrl }: CreateCheckoutSessionInput,
) {
  const minExpiry = Math.floor(Date.now() / 1000) + MIN_EXPIRATION_SECONDS;
  const expires_at = Math.max(Math.floor(expiresAt.getTime() / 1000), minExpiry);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "pen",
        unit_amount: Math.round(item.unitAmount * 100),
        product_data: { name: item.name },
      },
    })),
    invoice_creation: { enabled: true, invoice_data: { metadata: { orderId } } },
    metadata: { orderId },
    expires_at,
    success_url: successUrl,
    cancel_url: cancelUrl,
    integration_identifier: `ticketera_${randomLetters(8)}`,
  });

  return { id: session.id, url: session.url };
}
