import { EventCard } from "@/modules/events/components/EventCard";
import type { TicketEvent } from "@/modules/events/types/event.types";

interface EventGridProps {
  events: TicketEvent[];
}

export function EventGrid({ events }: EventGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}
