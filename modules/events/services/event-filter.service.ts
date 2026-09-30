import type { Event, EventCategory } from "@/modules/events/types/event.types"
import type {
  EventFilters,
  MonthOption,
  PriceRangeOption,
  SortOption,
} from "@/modules/events/types/event-filter.types"

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  query: "",
  categoryIds: [],
  cities: [],
  month: "all",
  priceRangeId: "all",
  sortBy: "date",
}

export const PRICE_RANGES: PriceRangeOption[] = [
  { id: "all", label: "Cualquier precio", min: 0, max: null },
  { id: "under-50", label: "Menos de S/ 50", min: 0, max: 49 },
  { id: "50-100", label: "S/ 50 - S/ 100", min: 50, max: 100 },
  { id: "over-100", label: "Más de S/ 100", min: 101, max: null },
]

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

function getYearMonth(startDate: string): string {
  return startDate.slice(0, 7)
}

function matchesQuery(event: Event, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  return (
    event.title.toLowerCase().includes(normalizedQuery) ||
    event.venueName.toLowerCase().includes(normalizedQuery) ||
    event.city.toLowerCase().includes(normalizedQuery)
  )
}

function matchesPriceRange(event: Event, priceRangeId: string): boolean {
  const range = PRICE_RANGES.find((priceRange) => priceRange.id === priceRangeId)

  if (!range) {
    return true
  }

  const isAboveMin = event.priceFrom >= range.min
  const isBelowMax = range.max === null || event.priceFrom <= range.max

  return isAboveMin && isBelowMax
}

function sortEvents(events: Event[], sortBy: SortOption): Event[] {
  const sorted = [...events]

  if (sortBy === "price") {
    sorted.sort((a, b) => a.priceFrom - b.priceFrom)
  } else {
    sorted.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
  }

  return sorted
}

export function applyEventFilters(events: Event[], filters: EventFilters): Event[] {
  const query = filters.query.trim().toLowerCase()

  const filtered = events.filter((event) => {
    if (query && !matchesQuery(event, query)) {
      return false
    }

    if (
      filters.categoryIds.length > 0 &&
      !filters.categoryIds.includes(event.categoryId)
    ) {
      return false
    }

    if (filters.cities.length > 0 && !filters.cities.includes(event.city)) {
      return false
    }

    if (filters.month !== "all" && getYearMonth(event.startDate) !== filters.month) {
      return false
    }

    if (
      filters.priceRangeId !== "all" &&
      !matchesPriceRange(event, filters.priceRangeId)
    ) {
      return false
    }

    return true
  })

  return sortEvents(filtered, filters.sortBy)
}

export function getCategoryCounts(
  events: Event[],
  categories: EventCategory[],
): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const category of categories) {
    counts[category.id] = 0
  }

  for (const event of events) {
    counts[event.categoryId] = (counts[event.categoryId] ?? 0) + 1
  }

  return counts
}

export function getAvailableCities(events: Event[]): string[] {
  const cities = new Set(events.map((event) => event.city))

  return Array.from(cities).sort((a, b) => a.localeCompare(b, "es"))
}

export function getAvailableMonths(events: Event[]): MonthOption[] {
  const values = new Set(events.map((event) => getYearMonth(event.startDate)))

  return Array.from(values)
    .sort()
    .map((value) => {
      const [year, month] = value.split("-")
      const monthIndex = Number(month) - 1

      return { value, label: `${MONTH_LABELS[monthIndex]} ${year}` }
    })
}
