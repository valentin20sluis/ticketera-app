import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/modules/users/types/user.types";
import { fromClerkApiUser } from "@/modules/users/utils/clerk-user-mappers";
import { upsertClerkUser } from "@/modules/users/services/user-sync.service";

export type CurrentUser = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const db = await getDb();
  const [existing] = await db.select().from(users).where(eq(users.clerkUserId, userId));
  if (existing) return existing;

  // Fallback for accounts created before the Clerk webhook was configured.
  const clerkUser = await (await clerkClient()).users.getUser(userId);
  return upsertClerkUser(db, fromClerkApiUser(clerkUser));
}

export async function requireRole(roles: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  if (user.isSuspended || !roles.includes(user.role)) redirect("/");
  return user;
}
