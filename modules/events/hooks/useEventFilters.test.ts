import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useEventFilters } from "./useEventFilters"
import type { Event, EventCategory } from "@/modules/events/types/event.types"

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
    minimumAge: "18",
    admissionType: "Entrada digital con QR",
    ...overrides,
  }
}

const CATEGORIES: EventCategory[] = [
  { id: "music", name: "Música", icon: {} as EventCategory["icon"], colorKey: "pink" },
  { id: "sports", name: "Deportes", icon: {} as EventCategory["icon"], colorKey: "blue" },
]

const EVENTS: Event[] = [
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
    startDate: "2026-10-01T19:00:00-05:00",
    priceFrom: 30,
  }),
]

describe("useEventFilters", () => {
  it("returns the default filters and all events sorted by date", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    expect(result.current.filters).toEqual({
      query: "",
      categoryIds: [],
      cities: [],
      month: "all",
      priceRangeId: "all",
      sortBy: "date",
    })
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["2", "1"])
    expect(result.current.categoryCounts).toEqual({ music: 1, sports: 1 })
    expect(result.current.availableCities).toEqual(["Arequipa", "Lima"])
    expect(result.current.availableMonths).toEqual([
      { value: "2026-10", label: "Octubre 2026" },
      { value: "2026-11", label: "Noviembre 2026" },
    ])
  })

  it("toggleCategory adds and then removes a category id", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.toggleCategory("music")
    })
    expect(result.current.filters.categoryIds).toEqual(["music"])
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["1"])

    act(() => {
      result.current.toggleCategory("music")
    })
    expect(result.current.filters.categoryIds).toEqual([])
  })

  it("toggleCity adds and then removes a city", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.toggleCity("Lima")
    })
    expect(result.current.filters.cities).toEqual(["Lima"])
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["1"])

    act(() => {
      result.current.toggleCity("Lima")
    })
    expect(result.current.filters.cities).toEqual([])
  })

  it("setQuery updates filters and filteredEvents", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.setQuery("rock")
    })

    expect(result.current.filters.query).toBe("rock")
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["1"])
  })

  it("setMonth updates filters and filteredEvents", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.setMonth("2026-10")
    })

    expect(result.current.filters.month).toBe("2026-10")
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["2"])
  })

  it("setPriceRangeId updates filters and filteredEvents", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.setPriceRangeId("under-50")
    })

    expect(result.current.filters.priceRangeId).toBe("under-50")
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["2"])
  })

  it("setSortBy updates filters and re-sorts filteredEvents", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.setSortBy("price")
    })

    expect(result.current.filters.sortBy).toBe("price")
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(["2", "1"])
  })

  it("resetFilters restores the default filter values", () => {
    const { result } = renderHook(() =>
      useEventFilters({ events: EVENTS, categories: CATEGORIES }),
    )

    act(() => {
      result.current.setQuery("rock")
      result.current.toggleCategory("music")
      result.current.toggleCity("Lima")
      result.current.setMonth("2026-11")
      result.current.setPriceRangeId("over-100")
      result.current.setSortBy("price")
    })

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.filters).toEqual({
      query: "",
      categoryIds: [],
      cities: [],
      month: "all",
      priceRangeId: "all",
      sortBy: "date",
    })
  })
})
