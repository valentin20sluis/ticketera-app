import Image from "next/image"
import { CalendarIcon, HeartIcon, MapPinIcon, Share2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format-currency"
import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock"
import type { Event } from "@/modules/events/types/event.types"
import { formatEventTime, formatFullEventDate } from "@/modules/events/utils/format-event-date"

interface EventDetailHeroProps {
  event: Event
}

export function EventDetailHero({ event }: EventDetailHeroProps) {
  const category = MOCK_CATEGORIES.find((item) => item.id === event.categoryId)

  return (
    <section className="relative h-[360px] w-full overflow-hidden sm:h-[440px] lg:h-[520px]">
      <Image
        src={event.imageUrl}
        alt={event.title}
        fill
        unoptimized
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <div className="relative flex h-full flex-col justify-end gap-3 px-4 pb-8 text-white sm:px-8 sm:pb-10 lg:px-16">
        {category && (
          <Badge className="w-fit bg-cta text-cta-foreground">{category.name}</Badge>
        )}
        <h1 className="font-heading max-w-2xl text-3xl font-bold sm:text-4xl lg:text-5xl">
          {event.title}
        </h1>
        <div className="flex items-center gap-1.5 text-sm text-white/80 sm:text-base">
          <CalendarIcon className="size-4 shrink-0" />
          <span>
            {formatFullEventDate(event.startDate)} · {formatEventTime(event.startDate)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/80 sm:text-base">
          <MapPinIcon className="size-4 shrink-0" />
          <span>
            {event.venueName}, {event.city}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
            Comprar entradas · Desde {formatPrice(event.priceFrom)}
          </Button>
          <Button variant="secondary" size="icon-lg" aria-label="Marcar como favorito">
            <HeartIcon />
          </Button>
          <Button variant="secondary" size="icon-lg" aria-label="Compartir evento">
            <Share2Icon />
          </Button>
        </div>
      </div>
    </section>
  )
}
