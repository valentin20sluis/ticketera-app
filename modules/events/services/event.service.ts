import type { Event } from "@/modules/events/types/event.types"

export function getFeaturedEvents(events: Event[]): Event[] {
  return events.filter((event) => event.featured)
}

export function getEventsByCategory(events: Event[], categoryId?: string): Event[] {
  if (categoryId === undefined || categoryId === "all") {
    return events
  }

  return events.filter((event) => event.categoryId === categoryId)
}
