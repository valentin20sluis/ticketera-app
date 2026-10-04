import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { seedEventCatalog } from "@/lib/db/seed/event-catalog";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Uso: npm run db:seed -- <email-del-organizador>");

  const db = await getDb();
  const [organizer] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.role, "organizer")));
  if (!organizer) throw new Error(`No existe un organizador con el email ${email}`);

  await seedEventCatalog(db, organizer.id);
  console.log("Catálogo de eventos cargado.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
