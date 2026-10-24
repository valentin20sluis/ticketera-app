"use server";

import { getDb } from "@/lib/db/client";
import { checkInInputSchema } from "@/modules/organizer/schemas/check-in.schema";
import {
  checkInTicket,
  CheckInError,
  type CheckInOutcome,
} from "@/modules/organizer/services/check-in.service";
import { requireRole } from "@/modules/users/services/current-user.service";

const ROLES = ["organizer", "admin", "super_admin"] as const;
const INVALID_INPUT = "Datos no válidos";
const FAILED = "No se pudo validar la entrada. Inténtalo de nuevo";

export type CheckInActionState = { ok: true; outcome: CheckInOutcome } | { ok: false; error: string };

// The actor always comes from the server session; only CheckInError messages reach the client.
export async function checkInTicketAction(input: unknown): Promise<CheckInActionState> {
  const actor = await requireRole([...ROLES]);
  const parsed = checkInInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };
  try {
    return { ok: true, outcome: await checkInTicket(await getDb(), actor, parsed.data) };
  } catch (error) {
    return { ok: false, error: error instanceof CheckInError ? error.message : FAILED };
  }
}
