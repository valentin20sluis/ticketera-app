import { NewsletterCard } from "@/components/shared/NewsletterCard"
import { CategoryChips } from "@/modules/events/components/CategoryChips"
import { HeroCarousel } from "@/modules/events/components/HeroCarousel"
import { HowItWorksSection } from "@/modules/events/components/HowItWorksSection"
import { UpcomingEventsSection } from "@/modules/events/components/UpcomingEventsSection"
import { MOCK_CATEGORIES, MOCK_EVENTS } from "@/modules/events/data/events.mock"
import { getFeaturedEvents } from "@/modules/events/services/event.service"

export default function Home() {
  const featuredEvents = getFeaturedEvents(MOCK_EVENTS)

  return (
    <>
      <HeroCarousel events={featuredEvents} />
      <div id="categorias">
        <CategoryChips categories={MOCK_CATEGORIES} />
      </div>
      <div id="eventos">
        <UpcomingEventsSection
          events={MOCK_EVENTS}
          categories={MOCK_CATEGORIES.map(({ id, name }) => ({ id, name }))}
        />
      </div>
      <div id="como-funciona">
        <HowItWorksSection />
      </div>
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <NewsletterCard />
      </section>
    </>
  )
}
