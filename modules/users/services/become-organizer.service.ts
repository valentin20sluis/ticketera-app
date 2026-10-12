import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";
import { UserActionError } from "@/modules/users/services/user-account.service";

export type BecomeOrganizerResult = "upgraded" | "already_organizer";

// The actor is only a hint: the outcome is decided by the atomic UPDATE and the SELECT after it.
export async function becomeOrganizer(db: Db, actor: CurrentUser): Promise<BecomeOrganizerResult> {
  const upgraded = await db
    .update(users)
    .set({ role: "organizer", updatedAt: new Date() })
    .where(
      and(
        eq(users.id, actor.id),
        eq(users.role, "customer"),
        eq(users.isSuspended, false),
        isNull(users.deletedAt),
      ),
    )
    .returning();
  if (upgraded.length > 0) return "upgraded";

  const [current] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!current || current.deletedAt) throw new UserActionError("No se pudo completar la acción");
  if (current.isSuspended) throw new UserActionError("Tu cuenta está suspendida");
  if (current.role === "organizer") return "already_organizer";
  throw new UserActionError("Tu cuenta ya tiene acceso al panel");
}
