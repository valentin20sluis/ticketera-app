import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";
import { organizerProfileSchema } from "../schemas/organizer-profile.schema";

// Only these messages are safe to show to the organizer; any other error stays generic.
export class OrganizerProfileError extends Error {}

export async function saveOrganizerProfile(db: Db, actor: CurrentUser, input: unknown) {
  if (actor.role !== "organizer") {
    throw new OrganizerProfileError("No tienes permiso para editar este perfil");
  }
  const parsed = organizerProfileSchema.safeParse(input);
  if (!parsed.success) throw new OrganizerProfileError("RUC no válido");

  const { ruc } = parsed.data;
  await db.update(users).set({ ruc, updatedAt: new Date() }).where(eq(users.id, actor.id));
  return ruc;
}
