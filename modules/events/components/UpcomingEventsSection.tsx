"use client"

import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventCard } from "@/modules/events/components/EventCard"
import { getEventsByCategory } from "@/modules/events/services/event.service"
import type { Event, EventCategory } from "@/modules/events/types/event.types"

interface UpcomingEventsSectionProps {
  events: Event[]
  categories: Pick<EventCategory, "id" | "name">[]
}

const ALL_CATEGORY_ID = "all"

function EventsGrid({ events }: { events: Event[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

export function UpcomingEventsSection({ events, categories }: UpcomingEventsSectionProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORY_ID)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Tabs
        value={selectedCategoryId}
        onValueChange={(value) => setSelectedCategoryId(String(value))}
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            Próximos eventos
          </h2>
          <TabsList>
            <TabsTrigger value={ALL_CATEGORY_ID}>Todos</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={ALL_CATEGORY_ID}>
          <EventsGrid events={getEventsByCategory(events, ALL_CATEGORY_ID)} />
        </TabsContent>
        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <EventsGrid events={getEventsByCategory(events, category.id)} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
