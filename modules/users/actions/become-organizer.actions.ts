"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { becomeOrganizer } from "@/modules/users/services/become-organizer.service";
import { getCurrentUser } from "@/modules/users/services/current-user.service";
import { UserActionError } from "@/modules/users/services/user-account.service";

export interface BecomeOrganizerState {
  error: string;
}

const FAILED = "No se pudo completar la acción";

export async function becomeOrganizerAction(): Promise<BecomeOrganizerState> {
  let signedIn = true;
  try {
    const user = await getCurrentUser();
    if (user) await becomeOrganizer(await getDb(), user);
    else signedIn = false;
  } catch (error) {
    if (error instanceof UserActionError) return { error: error.message };
    console.error("becomeOrganizerAction failed", error);
    return { error: FAILED };
  }

  // redirect throws NEXT_REDIRECT, so it must run outside the try/catch
  if (!signedIn) redirect("/ingresar");
  revalidatePath("/", "layout");
  redirect("/organizador");
}
