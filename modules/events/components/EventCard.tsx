import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { HeartbeatOnView } from "@/components/shared/HeartbeatOnView";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPrice } from "@/lib/formatters";
import { getEventPath } from "@/modules/events/services/event.service";
import {
  EVENT_CATEGORIES,
  type EventStatus,
  type TicketEvent,
} from "@/modules/events/types/event.types";

const STATUS_DISPLAY: Record<EventStatus, { label: string; className: string }> =
  {
    available: { label: "Disponible", className: "text-accent" },
    "low-stock": {
      label: "Últimas entradas",
      className: "font-semibold text-accent",
    },
    "sold-out": { label: "Agotado", className: "text-destructive" },
  };

interface EventCardProps {
  event: TicketEvent;
  priority?: boolean;
}

export function EventCard({ event, priority = false }: EventCardProps) {
  const categoryLabel = EVENT_CATEGORIES.find(
    (category) => category.value === event.category,
  )?.label;
  const status = STATUS_DISPLAY[event.status];

  const card = (
    <Card
      className={cn(
        "relative h-full gap-0 py-0 shadow-sm transition-shadow duration-300 ease-out hover:shadow-md motion-reduce:transition-none",
        "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={event.imageSrc}
          alt={event.imageAlt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 87vw"
          preload={priority}
          className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-105 motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
        />
        {categoryLabel ? (
          <Badge variant="secondary" className="absolute top-3 left-3">
            {categoryLabel}
          </Badge>
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-foreground md:text-lg">
          <Link
            href={getEventPath(event.slug)}
            className="outline-none after:absolute after:inset-0"
          >
            {event.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {formatDateTime(event.startsAt)}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {event.venue}, {event.city}
        </p>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 text-sm">
        <div className="flex items-end justify-between gap-2">
          <span className="text-muted-foreground">
            Desde{" "}
            <span className="text-lg font-semibold text-foreground">
              {formatPrice(event.minPrice)}
            </span>
          </span>
          <span className={cn("text-sm", status.className)}>{status.label}</span>
        </div>
        {event.status !== "sold-out" ? (
          // Visual only: the title link stretches over the whole card.
          <span
            aria-hidden="true"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 w-full border-foreground bg-transparent text-base text-foreground transition-colors duration-200 group-hover/card:bg-foreground/5 motion-reduce:transition-none",
            )}
          >
            Ver entradas
          </span>
        ) : null}
      </CardFooter>
    </Card>
  );

  return event.status === "low-stock" ? (
    <HeartbeatOnView>{card}</HeartbeatOnView>
  ) : (
    card
  );
}
