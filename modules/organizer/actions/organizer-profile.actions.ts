"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  OrganizerProfileError,
  saveOrganizerProfile,
} from "@/modules/organizer/services/organizer-profile.service";
import { requireRole } from "@/modules/users/services/current-user.service";

export type OrganizerProfileState = { error: string; ok?: boolean };

const FAILED = "No se pudo guardar el perfil. Inténtalo de nuevo";

// The actor comes from the server session; only OrganizerProfileError messages reach the client.
export async function saveOrganizerProfileAction(
  _prev: OrganizerProfileState,
  formData: FormData,
): Promise<OrganizerProfileState> {
  const actor = await requireRole(["organizer"]);
  try {
    await saveOrganizerProfile(await getDb(), actor, { ruc: formData.get("ruc") });
  } catch (error) {
    return { error: error instanceof OrganizerProfileError ? error.message : FAILED };
  }
  revalidatePath("/organizador/configuracion");
  return { error: "", ok: true };
}
