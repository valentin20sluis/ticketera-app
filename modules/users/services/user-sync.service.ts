import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { resolveInitialRole } from "@/modules/users/utils/permissions";

export interface ClerkUserInput {
  clerkUserId: string;
  email: string;
  fullName: string;
  publicRole?: unknown;
}

// Role is only set on insert: later syncs never overwrite a role changed in the panel.
export async function upsertClerkUser(db: Db, input: ClerkUserInput) {
  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email,
      fullName: input.fullName,
      role: resolveInitialRole(input.email, input.publicRole),
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email: input.email, fullName: input.fullName, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function markClerkUserDeleted(db: Db, clerkUserId: string) {
  await db
    .update(users)
    .set({ isSuspended: true, updatedAt: new Date() })
    .where(eq(users.clerkUserId, clerkUserId));
}
