import { describe, expect, it } from "vitest"

import {
  getEventBySlug,
  getEventsByCategory,
  getFeaturedEvents,
  getRelatedEvents,
} from "./event.service"
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
    doorsOpenTime: "19:00",
    showStartTime: "20:00",
    minimumAge: "Todo público",
    admissionType: "General",
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

describe("getEventBySlug", () => {
  const events = [
    buildEvent({ id: "1", slug: "rock-en-el-parque" }),
    buildEvent({ id: "2", slug: "final-de-copa" }),
  ]

  it("returns the event whose slug matches", () => {
    expect(getEventBySlug(events, "final-de-copa")).toEqual(events[1])
  })

  it("returns undefined when no event matches the slug", () => {
    expect(getEventBySlug(events, "nonexistent-slug")).toBeUndefined()
  })
})

describe("getRelatedEvents", () => {
  it("prioritizes events from the same category ordered by startDate ascending, excluding currentEvent", () => {
    const currentEvent = buildEvent({
      id: "1",
      categoryId: "music",
      startDate: "2026-11-15T20:00:00-05:00",
    })
    const events = [
      currentEvent,
      buildEvent({ id: "2", categoryId: "music", startDate: "2026-12-01T20:00:00-05:00" }),
      buildEvent({ id: "3", categoryId: "music", startDate: "2026-10-20T20:00:00-05:00" }),
      buildEvent({ id: "4", categoryId: "music", startDate: "2026-11-01T20:00:00-05:00" }),
      buildEvent({ id: "5", categoryId: "sports", startDate: "2026-09-01T20:00:00-05:00" }),
    ]

    const result = getRelatedEvents(events, currentEvent, 3)

    expect(result.map((event) => event.id)).toEqual(["3", "4", "2"])
    expect(result.some((event) => event.id === currentEvent.id)).toBe(false)
  })

  it("fills remaining slots with other categories, ordered by startDate ascending, when same category has fewer than limit", () => {
    const currentEvent = buildEvent({
      id: "1",
      categoryId: "music",
      startDate: "2026-11-15T20:00:00-05:00",
    })
    const events = [
      currentEvent,
      buildEvent({ id: "2", categoryId: "music", startDate: "2026-12-01T20:00:00-05:00" }),
      buildEvent({ id: "3", categoryId: "sports", startDate: "2026-10-20T20:00:00-05:00" }),
      buildEvent({ id: "4", categoryId: "theater", startDate: "2026-10-25T20:00:00-05:00" }),
      buildEvent({ id: "5", categoryId: "family", startDate: "2026-09-01T20:00:00-05:00" }),
    ]

    const result = getRelatedEvents(events, currentEvent, 4)

    expect(result.map((event) => event.id)).toEqual(["2", "5", "3", "4"])
    expect(result.some((event) => event.id === currentEvent.id)).toBe(false)
  })

  it("respects an explicit limit different from the default", () => {
    const currentEvent = buildEvent({
      id: "1",
      categoryId: "music",
      startDate: "2026-11-15T20:00:00-05:00",
    })
    const events = [
      currentEvent,
      buildEvent({ id: "2", categoryId: "music", startDate: "2026-12-01T20:00:00-05:00" }),
      buildEvent({ id: "3", categoryId: "music", startDate: "2026-10-20T20:00:00-05:00" }),
      buildEvent({ id: "4", categoryId: "sports", startDate: "2026-09-01T20:00:00-05:00" }),
    ]

    const result = getRelatedEvents(events, currentEvent, 2)

    expect(result).toHaveLength(2)
    expect(result.map((event) => event.id)).toEqual(["3", "2"])
    expect(result.some((event) => event.id === currentEvent.id)).toBe(false)
  })
})
