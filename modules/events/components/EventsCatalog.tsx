"use client"

import { FilterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventCard } from "@/modules/events/components/EventCard"
import { EventFilterPanel } from "@/modules/events/components/EventFilterPanel"
import { EventSearchBar } from "@/modules/events/components/EventSearchBar"
import { useEventFilters } from "@/modules/events/hooks/useEventFilters"
import type { Event, EventCategory } from "@/modules/events/types/event.types"
import type { SortOption } from "@/modules/events/types/event-filter.types"

interface EventsCatalogProps {
  events: Event[]
  categories: Pick<EventCategory, "id" | "name">[]
}

export function EventsCatalog({ events, categories }: EventsCatalogProps) {
  const {
    filters,
    filteredEvents,
    categoryCounts,
    availableCities,
    availableMonths,
    priceRanges,
    setQuery,
    toggleCategory,
    toggleCity,
    setMonth,
    setPriceRangeId,
    setSortBy,
    resetFilters,
  } = useEventFilters({ events, categories })

  const filterPanel = (
    <EventFilterPanel
      categories={categories}
      categoryCounts={categoryCounts}
      selectedCategoryIds={filters.categoryIds}
      onToggleCategory={toggleCategory}
      cities={availableCities}
      selectedCities={filters.cities}
      onToggleCity={toggleCity}
      months={availableMonths}
      selectedMonth={filters.month}
      onMonthChange={setMonth}
      priceRanges={priceRanges}
      selectedPriceRangeId={filters.priceRangeId}
      onPriceRangeChange={setPriceRangeId}
      onReset={resetFilters}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <EventSearchBar value={filters.query} onChange={setQuery} />
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" className="lg:hidden" />}
          >
            <FilterIcon />
            Filtros
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto lg:hidden">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">{filterPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="hidden w-64 shrink-0 lg:block">{filterPanel}</aside>

        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} eventos
            </p>
            <Tabs
              value={filters.sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <TabsList>
                <TabsTrigger value="date">Fecha</TabsTrigger>
                <TabsTrigger value="price">Precio más bajo</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No se encontraron eventos con estos filtros
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
