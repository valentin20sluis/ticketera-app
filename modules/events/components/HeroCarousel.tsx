"use client";

import Autoplay from "embla-carousel-autoplay";
import { CalendarDays, MapPin, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FocusEvent } from "react";

import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatDateTime } from "@/lib/formatters";
import { getEventPath } from "@/modules/events/services/event.service";
import type { TicketEvent } from "@/modules/events/types/event.types";

const AUTOPLAY_DELAY_MS = 6000;

const CONTROL_CLASSES =
  "pointer-events-auto relative inset-auto my-0 size-11 rounded-full [&_svg:not([class*='size-'])]:size-5 motion-reduce:transition-none";

interface HeroCarouselProps {
  events: TicketEvent[];
}

export function HeroCarousel({ events }: HeroCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [plugins] = useState(() => [
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      playOnInit: false,
      stopOnInteraction: false,
    }),
  ]);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const isPaused = userPaused ?? prefersReducedMotion;
  const shouldPlay = !isPaused && !isHovered && !hasFocus;

  useEffect(() => {
    if (!api) return;

    // Embla stops or restarts the plugin on drag and re-init; this re-applies
    // our state so a user pause is never overridden.
    const syncAutoplay = () => {
      const autoplay = api.plugins().autoplay;
      if (shouldPlay) autoplay?.play();
      else autoplay?.stop();
    };

    syncAutoplay();
    api.on("reInit", syncAutoplay).on("pointerUp", syncAutoplay);

    return () => {
      api.off("reInit", syncAutoplay).off("pointerUp", syncAutoplay);
    };
  }, [api, shouldPlay]);

  function handleTogglePause() {
    setUserPaused(!isPaused);
    // El botón pulsado conserva cursor y foco; sin esto la rotación no
    // arrancaría al reanudar hasta que ambos salgan del carrusel.
    if (isPaused) {
      setIsHovered(false);
      setHasFocus(false);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
  }

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={plugins}
      setApi={setApi}
      aria-label="Eventos destacados"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={handleBlur}
    >
      <CarouselContent
        className="ml-0"
        aria-live={shouldPlay ? "off" : "polite"}
      >
        {events.map((event, index) => (
          <CarouselItem
            key={event.id}
            aria-label={`${index + 1} de ${events.length}`}
            className="pl-0"
          >
            <div className="relative h-[32rem] overflow-hidden bg-muted md:h-[30rem] lg:h-[34rem]">
              <Image
                src={event.imageSrc}
                alt={event.imageAlt}
                fill
                sizes="100vw"
                preload={index === 0}
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-linear-to-t from-black/70 via-black/60 via-65% to-transparent"
                aria-hidden="true"
              />
              <Container className="relative flex h-full flex-col justify-end gap-4 pb-20 text-white">
                <h2 className="max-w-3xl text-3xl font-bold md:text-5xl">
                  {event.title}
                </h2>
                <div className="flex flex-col gap-2 text-sm md:text-base">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                    {formatDateTime(event.startsAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0" aria-hidden="true" />
                    {event.venue}, {event.city}
                  </p>
                </div>
                <Button
                  className="h-11 w-fit px-6 text-base"
                  render={<Link href={getEventPath(event.slug)} />}
                  nativeButton={false}
                >
                  Comprar entradas
                </Button>
              </Container>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="pointer-events-none absolute inset-x-0 bottom-4">
        <Container className="flex justify-end gap-2">
          <CarouselPrevious aria-label="Anterior" className={CONTROL_CLASSES} />
          <Button
            variant="outline"
            size="icon"
            className={CONTROL_CLASSES}
            aria-label={isPaused ? "Reanudar rotación" : "Pausar rotación"}
            onClick={handleTogglePause}
          >
            {isPaused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
          </Button>
          <CarouselNext aria-label="Siguiente" className={CONTROL_CLASSES} />
        </Container>
      </div>
    </Carousel>
  );
}
