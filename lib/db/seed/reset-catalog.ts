import type { Db } from "@/lib/db/client";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  venues,
  venueZones,
} from "@/lib/db/schema";

// Accepts the pool-backed db or a transaction of it (a nested one becomes a savepoint).
export type DbLike = Pick<Db, "select" | "insert" | "delete" | "transaction">;

// Children first, so every FK is satisfied. Users are never touched.
const TABLES_IN_DELETE_ORDER = [
  ["tickets", tickets],
  ["order_items", orderItems],
  ["orders", orders],
  ["function_zones", functionZones],
  ["event_functions", eventFunctions],
  ["events", events],
  ["venue_zones", venueZones],
  ["venues", venues],
  ["event_categories", eventCategories],
] as const;

export async function resetCatalog(db: DbLike): Promise<Record<string, number>> {
  return db.transaction(async (tx) => {
    const deleted: Record<string, number> = {};
    for (const [name, table] of TABLES_IN_DELETE_ORDER) {
      deleted[name] = (await tx.delete(table).returning()).length;
    }
    return deleted;
  });
}
