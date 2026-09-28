"use client";

import { useState } from "react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { CategoryTabs } from "@/modules/events/components/CategoryTabs";
import { EventGrid } from "@/modules/events/components/EventGrid";
import { filterEventsByCategory } from "@/modules/events/services/event.service";
import type {
  EventCategoryFilter,
  TicketEvent,
} from "@/modules/events/types/event.types";

interface FeaturedEventsProps {
  events: TicketEvent[];
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const [category, setCategory] = useState<EventCategoryFilter>("all");
  const visibleEvents = filterEventsByCategory(events, category);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Eventos destacados" actionHref="/events" />
      <CategoryTabs value={category} onValueChange={setCategory} />
      <div aria-live="polite">
        <EventGrid events={visibleEvents} />
      </div>
    </div>
  );
}
