"use client"

import { useCallback, useMemo, useState } from "react"

import {
  DEFAULT_EVENT_FILTERS,
  PRICE_RANGES,
  applyEventFilters,
  getAvailableCities,
  getAvailableMonths,
  getCategoryCounts,
} from "@/modules/events/services/event-filter.service"
import type { Event, EventCategory } from "@/modules/events/types/event.types"
import type { EventFilters, SortOption } from "@/modules/events/types/event-filter.types"

interface UseEventFiltersOptions {
  events: Event[]
  categories: Pick<EventCategory, "id" | "name">[]
}

interface UseEventFiltersResult {
  filters: EventFilters
  filteredEvents: Event[]
  categoryCounts: Record<string, number>
  availableCities: string[]
  availableMonths: ReturnType<typeof getAvailableMonths>
  priceRanges: typeof PRICE_RANGES
  setQuery: (query: string) => void
  toggleCategory: (categoryId: string) => void
  toggleCity: (city: string) => void
  setMonth: (month: string) => void
  setPriceRangeId: (priceRangeId: string) => void
  setSortBy: (sortBy: SortOption) => void
  resetFilters: () => void
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value]
}

export function useEventFilters({
  events,
  categories,
}: UseEventFiltersOptions): UseEventFiltersResult {
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_EVENT_FILTERS)

  const setQuery = useCallback((query: string) => {
    setFilters((current) => ({ ...current, query }))
  }, [])

  const toggleCategory = useCallback((categoryId: string) => {
    setFilters((current) => ({
      ...current,
      categoryIds: toggleValue(current.categoryIds, categoryId),
    }))
  }, [])

  const toggleCity = useCallback((city: string) => {
    setFilters((current) => ({
      ...current,
      cities: toggleValue(current.cities, city),
    }))
  }, [])

  const setMonth = useCallback((month: string) => {
    setFilters((current) => ({ ...current, month }))
  }, [])

  const setPriceRangeId = useCallback((priceRangeId: string) => {
    setFilters((current) => ({ ...current, priceRangeId }))
  }, [])

  const setSortBy = useCallback((sortBy: SortOption) => {
    setFilters((current) => ({ ...current, sortBy }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_EVENT_FILTERS)
  }, [])

  const filteredEvents = useMemo(
    () => applyEventFilters(events, filters),
    [events, filters],
  )

  const categoryCounts = useMemo(
    () => getCategoryCounts(events, categories),
    [events, categories],
  )

  const availableCities = useMemo(() => getAvailableCities(events), [events])

  const availableMonths = useMemo(() => getAvailableMonths(events), [events])

  return {
    filters,
    filteredEvents,
    categoryCounts,
    availableCities,
    availableMonths,
    priceRanges: PRICE_RANGES,
    setQuery,
    toggleCategory,
    toggleCity,
    setMonth,
    setPriceRangeId,
    setSortBy,
    resetFilters,
  }
}
