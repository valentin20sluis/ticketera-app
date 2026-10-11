import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { eventFunctions, events } from "@/lib/db/schema";
import { parseEventListOptions } from "@/modules/events/schemas/event-list-options.schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";

export type EventViewer = Pick<CurrentUser, "id" | "role" | "isSuspended" | "deletedAt"> | null;

export type EventScope =
  | { kind: "public" }
  | { kind: "own"; organizerId: string }
  | { kind: "all" };

export interface ViewerEvent {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  status: (typeof events.$inferSelect)["status"];
  startDate: string | null;
}

export function resolveEventScope(viewer: EventViewer): EventScope {
  if (!viewer || viewer.isSuspended || viewer.deletedAt) return { kind: "public" };
  if (viewer.role === "organizer") return { kind: "own", organizerId: viewer.id };
  if (viewer.role === "admin" || viewer.role === "super_admin") return { kind: "all" };
  return { kind: "public" };
}

// The scope comes only from the viewer; options can narrow it, never widen it.
export async function listEventsForViewer(
  db: Db,
  viewer: EventViewer,
  rawOptions: unknown = {},
): Promise<ViewerEvent[]> {
  const options = parseEventListOptions(rawOptions);
  const scope = resolveEventScope(viewer);

  const filters =
    scope.kind === "public"
      ? [eq(events.status, "published")]
      : [
          scope.kind === "own"
            ? eq(events.organizerId, scope.organizerId)
            : options.organizerId
              ? eq(events.organizerId, options.organizerId)
              : undefined,
          options.status ? eq(events.status, options.status) : undefined,
        ];

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      imageUrl: events.imageUrl,
      status: events.status,
    })
    .from(events)
    .where(and(...filters))
    .orderBy(desc(events.createdAt), asc(events.id))
    .limit(options.limit);

  if (rows.length === 0) return [];

  // An event's date is its earliest function (deterministic even for past events).
  const functionRows = await db
    .select({ eventId: eventFunctions.eventId, startsAt: eventFunctions.startsAt })
    .from(eventFunctions)
    .where(inArray(eventFunctions.eventId, rows.map((row) => row.id)));

  const earliest = new Map<string, Date>();
  for (const { eventId, startsAt } of functionRows) {
    const current = earliest.get(eventId);
    if (!current || startsAt < current) earliest.set(eventId, startsAt);
  }

  return rows.map((row) => ({ ...row, startDate: earliest.get(row.id)?.toISOString() ?? null }));
}
