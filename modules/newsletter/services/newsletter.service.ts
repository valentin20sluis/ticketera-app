import type { Db } from "@/lib/db/client";
import { newsletterSubscribers } from "@/lib/db/schema";

// Expects an email already normalized by newsletterEmailSchema. Duplicates are ignored silently.
export async function subscribe(db: Db, email: string): Promise<void> {
  await db.insert(newsletterSubscribers).values({ email }).onConflictDoNothing();
}
