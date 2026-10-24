"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";
import { ConnectActionError, createOnboardingLink } from "@/modules/payments/services/stripe-connect.service";
import { requireRole } from "@/modules/users/services/current-user.service";

export interface ConnectActionState {
  error?: string;
}

const FAILED = "No se pudo conectar con Stripe";
const CALLBACK = "/api/stripe/connect/callback";

export async function connectStripeAction(): Promise<ConnectActionState> {
  const user = await requireRole(["organizer"]);

  // Origin comes from request headers (same approach as inviteUser), never from client input.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const origin = requestHeaders.get("origin") ?? `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;

  let url: string;
  try {
    url = await createOnboardingLink(await getDb(), stripe, user, {
      refreshUrl: `${origin}${CALLBACK}?type=refresh`,
      returnUrl: `${origin}${CALLBACK}?type=return`,
    });
  } catch (error) {
    return { error: error instanceof ConnectActionError ? error.message : FAILED };
  }
  // redirect() throws, so it stays outside the try/catch.
  redirect(url);
}
