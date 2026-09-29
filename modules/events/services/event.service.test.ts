import { describe, expect, it } from "vitest"

import { getEventsByCategory, getFeaturedEvents } from "./event.service"
import type { Event } from "@/modules/events/types/event.types"

function buildEvent(overrides: Partial<Event>): Event {
  return {
    id: "1",
    slug: "sample-event",
    title: "Sample Event",
    categoryId: "music",
    description: "Sample description",
    venueName: "Sample Venue",
    city: "Lima",
    startDate: "2026-11-15T20:00:00-05:00",
    imageUrl: "https://picsum.photos/seed/sample-event/800/500",
    priceFrom: 50,
    currency: "PEN",
    status: "available",
    featured: false,
    ...overrides,
  }
}

describe("getFeaturedEvents", () => {
  it("returns only events with featured: true", () => {
    const events = [
      buildEvent({ id: "1", featured: true }),
      buildEvent({ id: "2", featured: false }),
      buildEvent({ id: "3", featured: true }),
    ]

    expect(getFeaturedEvents(events)).toEqual([events[0], events[2]])
  })

  it("returns an empty array when no events are featured", () => {
    const events = [buildEvent({ id: "1", featured: false })]

    expect(getFeaturedEvents(events)).toEqual([])
  })
})

describe("getEventsByCategory", () => {
  const events = [
    buildEvent({ id: "1", categoryId: "music" }),
    buildEvent({ id: "2", categoryId: "sports" }),
    buildEvent({ id: "3", categoryId: "music" }),
  ]

  it("returns all events when categoryId is \"all\"", () => {
    expect(getEventsByCategory(events, "all")).toEqual(events)
  })

  it("returns all events when categoryId is undefined", () => {
    expect(getEventsByCategory(events, undefined)).toEqual(events)
  })

  it("returns only events matching the given categoryId", () => {
    expect(getEventsByCategory(events, "music")).toEqual([events[0], events[2]])
  })
})
