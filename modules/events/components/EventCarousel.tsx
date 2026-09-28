"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EventCard } from "@/modules/events/components/EventCard";
import type { TicketEvent } from "@/modules/events/types/event.types";

interface EventCarouselProps {
  events: TicketEvent[];
  "aria-label": string;
}

const NAV_BUTTON_CLASSES =
  "relative inset-auto my-0 size-11 [&_svg:not([class*='size-'])]:size-5 motion-reduce:transition-none";

export function EventCarousel({
  events,
  "aria-label": ariaLabel,
}: EventCarouselProps) {
  return (
    <Carousel
      opts={{ align: "start", dragFree: true }}
      aria-label={ariaLabel}
    >
      <div className="mb-2 flex justify-end gap-2">
        <CarouselPrevious aria-label="Anterior" className={NAV_BUTTON_CLASSES} />
        <CarouselNext aria-label="Siguiente" className={NAV_BUTTON_CLASSES} />
      </div>
      <CarouselContent className="py-3 md:-ml-6">
        {events.map((event, index) => (
          <CarouselItem
            key={event.id}
            aria-label={`${index + 1} de ${events.length}`}
            className="basis-[87%] sm:basis-1/2 md:pl-6 lg:basis-1/4"
          >
            <EventCard event={event} />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
