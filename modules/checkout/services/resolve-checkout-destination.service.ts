import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { eventFunctions, events, functionZones, users } from "@/lib/db/schema";
import { canAcceptPayments } from "@/modules/payments/utils/can-accept-payments";

export type ResolveCheckoutDestinationResult =
  | { ok: true; eventSlug: string; stripeAccountId: string }
  | { ok: false; error: "zone_not_found" | "multiple_events" | "organizer_payments_unavailable" };

export async function resolveCheckoutDestination(
  db: Db,
  functionZoneIds: string[],
): Promise<ResolveCheckoutDestinationResult> {
  const ids = [...new Set(functionZoneIds)];
  if (ids.length === 0) return { ok: false, error: "zone_not_found" };

  const rows = await db
    .select({
      zoneId: functionZones.id,
      eventId: events.id,
      eventSlug: events.slug,
      stripeAccountId: users.stripeAccountId,
      stripeChargesEnabled: users.stripeChargesEnabled,
    })
    .from(functionZones)
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .innerJoin(users, eq(users.id, events.organizerId))
    .where(inArray(functionZones.id, ids));

  if (rows.length !== ids.length) return { ok: false, error: "zone_not_found" };

  const [first] = rows;
  if (rows.some((r) => r.eventId !== first.eventId)) return { ok: false, error: "multiple_events" };

  if (!canAcceptPayments(first)) {
    return { ok: false, error: "organizer_payments_unavailable" };
  }
  return { ok: true, eventSlug: first.eventSlug, stripeAccountId: first.stripeAccountId! };
}
