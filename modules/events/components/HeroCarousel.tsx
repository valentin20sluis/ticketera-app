"use client"

import Image from "next/image"
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format-currency"
import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock"
import type { Event } from "@/modules/events/types/event.types"
import { useHeroCarousel } from "@/modules/events/hooks/useHeroCarousel"

interface HeroCarouselProps {
  events: Event[]
}

const AUTOPLAY_INTERVAL_MS = 6000

export function HeroCarousel({ events }: HeroCarouselProps) {
  const { index, isPaused, next, prev, togglePause } = useHeroCarousel(events.length, {
    intervalMs: AUTOPLAY_INTERVAL_MS,
  })

  if (events.length === 0) {
    return null
  }

  const activeEvent = events[index]
  const category = MOCK_CATEGORIES.find((item) => item.id === activeEvent.categoryId)

  return (
    <section className="relative h-[420px] w-full overflow-hidden sm:h-[480px] lg:h-[560px]">
      <Image
        key={activeEvent.id}
        src={activeEvent.imageUrl}
        alt={activeEvent.title}
        fill
        unoptimized
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <div className="relative flex h-full flex-col justify-end gap-3 px-4 pb-16 text-white sm:px-8 sm:pb-20 lg:px-16">
        {category && (
          <span className="text-xs font-semibold tracking-wide text-cta uppercase">
            {category.name}
          </span>
        )}
        <h2 className="font-heading max-w-2xl text-3xl font-bold sm:text-4xl lg:text-5xl">
          {activeEvent.title}
        </h2>
        <p className="text-sm text-white/80 sm:text-base">
          {activeEvent.venueName}, {activeEvent.city}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-lg font-semibold">
            Desde {formatPrice(activeEvent.priceFrom)}
          </span>
          <Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
            Ver detalles
          </Button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-4 pb-4 sm:px-8">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Evento anterior"
            onClick={prev}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Evento siguiente"
            onClick={next}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={
              isPaused
                ? "Reanudar reproducción automática"
                : "Pausar reproducción automática"
            }
            onClick={togglePause}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {events.map((event, thumbnailIndex) => (
            <div
              key={event.id}
              aria-current={thumbnailIndex === index}
              className={cn(
                "relative h-10 w-16 shrink-0 overflow-hidden rounded-md ring-2 ring-transparent transition",
                thumbnailIndex === index && "ring-white"
              )}
            >
              <Image src={event.imageUrl} alt="" fill unoptimized className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
