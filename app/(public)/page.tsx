import { NewsletterCard } from "@/components/shared/NewsletterCard"
import { CategoryChips } from "@/modules/events/components/CategoryChips"
import { HeroCarousel } from "@/modules/events/components/HeroCarousel"
import { HowItWorksSection } from "@/modules/events/components/HowItWorksSection"
import { UpcomingEventsSection } from "@/modules/events/components/UpcomingEventsSection"
import { getDb } from "@/lib/db/client"
import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock"
import {
  listPublicEvents,
  pickHeroEvents,
} from "@/modules/events/services/list-public-events.service"
import { connection } from "next/server"

export default async function Home() {
  await connection()
  const events = await listPublicEvents(await getDb())

  return (
    <>
      <HeroCarousel events={pickHeroEvents(events)} />
      <div id="categorias">
        <CategoryChips categories={MOCK_CATEGORIES} />
      </div>
      <div id="eventos">
        <UpcomingEventsSection
          events={events}
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
