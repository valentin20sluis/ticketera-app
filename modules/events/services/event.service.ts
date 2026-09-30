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

export function getEventBySlug(events: Event[], slug: string): Event | undefined {
  return events.find((event) => event.slug === slug)
}

function sortByStartDateAsc(events: Event[]): Event[] {
  return [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )
}

export function getRelatedEvents(
  events: Event[],
  currentEvent: Event,
  limit = 4,
): Event[] {
  const otherEvents = events.filter((event) => event.id !== currentEvent.id)

  const sameCategory = sortByStartDateAsc(
    otherEvents.filter((event) => event.categoryId === currentEvent.categoryId),
  )

  const related = sameCategory.slice(0, limit)

  if (related.length < limit) {
    const relatedIds = new Set(related.map((event) => event.id))
    const fillers = sortByStartDateAsc(
      otherEvents.filter((event) => !relatedIds.has(event.id)),
    )

    related.push(...fillers.slice(0, limit - related.length))
  }

  return related
}
