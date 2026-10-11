import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events, orderItems, orders, tickets, users } from "@/lib/db/schema";
import { seedEventCatalog } from "@/lib/db/seed/event-catalog";
import { resetCatalog } from "@/lib/db/seed/reset-catalog";

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const email = args.find((arg) => arg !== "--reset");
  if (!email) throw new Error("Uso: npm run db:seed -- <email-del-organizador> [--reset]");

  const db = await getDb();
  const [organizer] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.role, "organizer")));
  if (!organizer) throw new Error(`No existe un organizador con el email ${email}`);

  if (!reset) {
    await seedEventCatalog(db, organizer.id);
    console.log("Catálogo de eventos cargado.");
    return;
  }

  const [[o], [i], [t], [e]] = await Promise.all(
    [orders, orderItems, tickets, events].map((table) => db.select({ n: count() }).from(table)),
  );
  console.log(
    `--reset: se BORRARÁN ${o.n} pedidos, ${i.n} líneas de pedido, ${t.n} entradas y ${e.n} eventos ` +
      "(con sus funciones, zonas, sedes y categorías). Los usuarios no se tocan.",
  );

  // One transaction: if the seed fails, the reset is rolled back too.
  await db.transaction(async (tx) => {
    await resetCatalog(tx);
    await seedEventCatalog(tx, organizer.id);
  });

  const [{ n: created }] = await db.select({ n: count() }).from(events);
  console.log(`Reinicio completo: ${created} eventos creados, 0 pedidos, 0 entradas.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
