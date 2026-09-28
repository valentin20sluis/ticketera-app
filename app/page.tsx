import { Container } from "@/components/shared/Container";
import { CtaBanner } from "@/components/shared/CtaBanner";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { EventCarousel } from "@/modules/events/components/EventCarousel";
import { EventSearchBar } from "@/modules/events/components/EventSearchBar";
import { FeaturedEvents } from "@/modules/events/components/FeaturedEvents";
import { HeroCarousel } from "@/modules/events/components/HeroCarousel";
import {
  getEventCities,
  getEvents,
  getFeaturedEvents,
  getThisWeekEvents,
} from "@/modules/events/services/event.service";

const SECTION_CLASSES = "scroll-mt-20 py-12 md:py-16";

export default async function Home() {
  const [heroEvents, events, thisWeekEvents, cities] = await Promise.all([
    getFeaturedEvents(),
    getEvents(),
    getThisWeekEvents(),
    getEventCities(),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <h1 className="sr-only">
          Ticketera: entradas para conciertos, deportes, teatro, festivales y
          eventos en familia
        </h1>
        <section>
          <HeroCarousel events={heroEvents} />
        </section>
        <section className={SECTION_CLASSES}>
          <Container>
            <EventSearchBar cities={cities} />
          </Container>
        </section>
        <section id="events" className={SECTION_CLASSES}>
          <Container>
            <FeaturedEvents events={events} />
          </Container>
        </section>
        <section id="this-week" className={SECTION_CLASSES}>
          <Container className="flex flex-col gap-6">
            <SectionHeader title="Esta semana" actionHref="/events" />
            <EventCarousel
              events={thisWeekEvents}
              aria-label="Eventos de esta semana"
            />
          </Container>
        </section>
        <section id="organize" className={SECTION_CLASSES}>
          <Container>
            <CtaBanner
              title="Organiza tu evento"
              description="Publica tu evento, vende entradas en línea y llega a miles de asistentes con la Ticketera."
              actionLabel="Empezar ahora"
              actionHref="/organize"
            />
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
