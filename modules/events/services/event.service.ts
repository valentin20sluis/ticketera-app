import { eventsMock } from "@/modules/events/data/event.mock";
import type {
  EventCategoryFilter,
  TicketEvent,
} from "@/modules/events/types/event.types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function byStartsAt(a: TicketEvent, b: TicketEvent): number {
  return Date.parse(a.startsAt) - Date.parse(b.startsAt);
}

export async function getEvents(): Promise<TicketEvent[]> {
  return [...eventsMock].sort(byStartsAt);
}

export async function getFeaturedEvents(): Promise<TicketEvent[]> {
  const events = await getEvents();
  return events.filter((event) => event.featured);
}

export async function getThisWeekEvents(
  now: Date = new Date(),
): Promise<TicketEvent[]> {
  const from = now.getTime();
  const to = from + WEEK_MS;
  const events = await getEvents();
  return events.filter((event) => {
    const startsAt = Date.parse(event.startsAt);
    return startsAt >= from && startsAt < to;
  });
}

export async function getEventCities(): Promise<string[]> {
  const cities = new Set(eventsMock.map((event) => event.city));
  return [...cities].sort((a, b) => a.localeCompare(b, "es"));
}

export function filterEventsByCategory(
  events: TicketEvent[],
  category: EventCategoryFilter,
): TicketEvent[] {
  if (category === "all") return [...events];
  return events.filter((event) => event.category === category);
}

export function getEventPath(slug: string): string {
  return `/events/${slug}`;
}
