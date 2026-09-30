import { EventCard } from "@/modules/events/components/EventCard"
import type { Event } from "@/modules/events/types/event.types"

interface RelatedEventsSectionProps {
  events: Event[]
}

export function RelatedEventsSection({ events }: RelatedEventsSectionProps) {
  if (events.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="font-heading text-2xl font-semibold text-foreground">
        También te puede interesar
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
