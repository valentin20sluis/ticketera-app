import { asc } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { eventCategories } from "@/lib/db/schema";
import type { EventCategory } from "@/modules/events/types/event.types";

export async function listPublicCategories(db: Db): Promise<EventCategory[]> {
  const rows = await db
    .select({
      id: eventCategories.id,
      name: eventCategories.name,
      iconKey: eventCategories.iconKey,
      colorKey: eventCategories.colorKey,
    })
    .from(eventCategories)
    .orderBy(asc(eventCategories.name));
  // ponytail: color_key is free text in the DB; the UI falls back to neutral for unknown values.
  return rows as EventCategory[];
}
