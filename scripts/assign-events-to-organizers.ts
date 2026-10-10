import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events, users } from "@/lib/db/schema";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function main() {
  const db = await getDb();

  const organizers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "organizer"));
  if (organizers.length === 0) {
    throw new Error("No hay usuarios con rol 'organizer' en la base de datos.");
  }

  const allEvents = await db.select({ id: events.id, title: events.title }).from(events);
  if (allEvents.length === 0) {
    console.log("No hay eventos para reasignar.");
    return;
  }

  for (const event of allEvents) {
    const organizer = pickRandom(organizers);
    await db
      .update(events)
      .set({ organizerId: organizer.id, updatedAt: new Date() })
      .where(eq(events.id, event.id));
    console.log(`"${event.title}" -> ${organizer.email}`);
  }

  console.log(`${allEvents.length} evento(s) reasignados entre ${organizers.length} organizador(es).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
