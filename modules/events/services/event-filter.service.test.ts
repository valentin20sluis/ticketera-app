import { describe, expect, it } from "vitest"

import {
  DEFAULT_EVENT_FILTERS,
  applyEventFilters,
  getAvailableCities,
  getAvailableMonths,
  getCategoryCounts,
} from "./event-filter.service"
import type { Event, EventCategory } from "@/modules/events/types/event.types"
import type { EventFilters } from "@/modules/events/types/event-filter.types"

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

function buildFilters(overrides: Partial<EventFilters>): EventFilters {
  return { ...DEFAULT_EVENT_FILTERS, ...overrides }
}

const CATEGORIES: EventCategory[] = [
  { id: "music", name: "Música", icon: {} as EventCategory["icon"], colorKey: "pink" },
  { id: "sports", name: "Deportes", icon: {} as EventCategory["icon"], colorKey: "blue" },
  { id: "theater", name: "Teatro", icon: {} as EventCategory["icon"], colorKey: "purple" },
]

describe("applyEventFilters", () => {
  const events = [
    buildEvent({
      id: "1",
      title: "Rock en el Parque",
      categoryId: "music",
      venueName: "Parque de la Exposición",
      city: "Lima",
      startDate: "2026-11-15T20:00:00-05:00",
      priceFrom: 80,
    }),
    buildEvent({
      id: "2",
      title: "Final de Copa",
      categoryId: "sports",
      venueName: "Estadio Nacional",
      city: "Arequipa",
      startDate: "2026-12-01T19:00:00-05:00",
      priceFrom: 60,
    }),
    buildEvent({
      id: "3",
      title: "Romeo y Julieta",
      categoryId: "theater",
      venueName: "Teatro Municipal",
      city: "Cusco",
      startDate: "2026-10-20T19:30:00-05:00",
      priceFrom: 45,
    }),
    buildEvent({
      id: "4",
      title: "Jazz Nights",
      categoryId: "music",
      venueName: "Cocktails Jazz Club",
      city: "Cusco",
      startDate: "2026-10-25T21:00:00-05:00",
      priceFrom: 150,
    }),
  ]

  it("with default filters returns all events sorted by date ascending", () => {
    const result = applyEventFilters(events, DEFAULT_EVENT_FILTERS)

    expect(result.map((event) => event.id)).toEqual(["3", "4", "1", "2"])
  })

  it("filters by query matching title, venueName or city case-insensitively", () => {
    const byTitle = applyEventFilters(events, buildFilters({ query: "rock" }))
    expect(byTitle.map((e) => e.id)).toEqual(["1"])

    const byVenue = applyEventFilters(events, buildFilters({ query: "TEATRO municipal" }))
    expect(byVenue.map((e) => e.id)).toEqual(["3"])

    const byCity = applyEventFilters(events, buildFilters({ query: "cusco" }))
    expect(byCity.map((e) => e.id)).toEqual(["3", "4"])
  })

  it("filters by categoryIds with OR semantics between selected categories", () => {
    const result = applyEventFilters(
      events,
      buildFilters({ categoryIds: ["sports", "theater"] }),
    )

    expect(result.map((e) => e.id)).toEqual(["3", "2"])
  })

  it("filters by cities with OR semantics between selected cities", () => {
    const result = applyEventFilters(events, buildFilters({ cities: ["Lima", "Arequipa"] }))

    expect(result.map((e) => e.id)).toEqual(["1", "2"])
  })

  it("filters by month matching the YYYY-MM of startDate", () => {
    const result = applyEventFilters(events, buildFilters({ month: "2026-10" }))

    expect(result.map((e) => e.id)).toEqual(["3", "4"])
  })

  it("filters by priceRangeId within an inclusive range", () => {
    const underFifty = applyEventFilters(events, buildFilters({ priceRangeId: "under-50" }))
    expect(underFifty.map((e) => e.id)).toEqual(["3"])

    const overHundred = applyEventFilters(events, buildFilters({ priceRangeId: "over-100" }))
    expect(overHundred.map((e) => e.id)).toEqual(["4"])
  })

  it("combines 2+ filters with AND semantics", () => {
    const result = applyEventFilters(
      events,
      buildFilters({ categoryIds: ["music"], cities: ["Cusco"] }),
    )

    expect(result.map((e) => e.id)).toEqual(["4"])
  })

  it('sorts by "date" ascending', () => {
    const result = applyEventFilters(events, buildFilters({ sortBy: "date" }))

    expect(result.map((e) => e.id)).toEqual(["3", "4", "1", "2"])
  })

  it('sorts by "price" ascending', () => {
    const result = applyEventFilters(events, buildFilters({ sortBy: "price" }))

    expect(result.map((e) => e.id)).toEqual(["3", "2", "1", "4"])
  })
})

describe("getCategoryCounts", () => {
  it("counts events per categoryId over the full set, including zero-count categories", () => {
    const events = [
      buildEvent({ id: "1", categoryId: "music" }),
      buildEvent({ id: "2", categoryId: "music" }),
      buildEvent({ id: "3", categoryId: "sports" }),
    ]

    expect(getCategoryCounts(events, CATEGORIES)).toEqual({
      music: 2,
      sports: 1,
      theater: 0,
    })
  })
})

describe("getAvailableCities", () => {
  it("returns unique cities sorted alphabetically", () => {
    const events = [
      buildEvent({ id: "1", city: "Trujillo" }),
      buildEvent({ id: "2", city: "Lima" }),
      buildEvent({ id: "3", city: "Arequipa" }),
      buildEvent({ id: "4", city: "Lima" }),
    ]

    expect(getAvailableCities(events)).toEqual(["Arequipa", "Lima", "Trujillo"])
  })
})

describe("getAvailableMonths", () => {
  it("returns unique months sorted chronologically with a capitalized Spanish label", () => {
    const events = [
      buildEvent({ id: "1", startDate: "2026-11-15T20:00:00-05:00" }),
      buildEvent({ id: "2", startDate: "2026-10-20T19:30:00-05:00" }),
      buildEvent({ id: "3", startDate: "2026-10-25T21:00:00-05:00" }),
    ]

    expect(getAvailableMonths(events)).toEqual([
      { value: "2026-10", label: "Octubre 2026" },
      { value: "2026-11", label: "Noviembre 2026" },
    ])
  })
})
