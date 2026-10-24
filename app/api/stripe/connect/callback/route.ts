import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";
import { createOnboardingLink, syncConnectAccount } from "@/modules/payments/services/stripe-connect.service";
import { requireRole } from "@/modules/users/services/current-user.service";

const PANEL = "/organizador";

export async function GET(request: NextRequest) {
  const user = await requireRole(["organizer"]);
  const { origin, searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const toPanel = () => NextResponse.redirect(new URL(PANEL, origin));

  if (!user.stripeAccountId || (type !== "refresh" && type !== "return")) return toPanel();

  try {
    if (type === "refresh") {
      const callback = `${origin}/api/stripe/connect/callback`;
      const url = await createOnboardingLink(await getDb(), stripe, user, {
        refreshUrl: `${callback}?type=refresh`,
        returnUrl: `${callback}?type=return`,
      });
      return NextResponse.redirect(url);
    }
    await syncConnectAccount(await getDb(), stripe, user.stripeAccountId);
  } catch {
    // The connect webhook reconciles later; the user just lands back on the panel.
  }
  return toPanel();
}
