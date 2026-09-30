import { notFound } from "next/navigation"

import { TicketSelectionView } from "@/modules/events/components/TicketSelectionView"
import { MOCK_EVENTS } from "@/modules/events/data/events.mock"
import { getEventBySlug } from "@/modules/events/services/event.service"
import { getVenueZones } from "@/modules/events/services/venue-zone.service"

interface TicketSelectionPageProps {
  params: Promise<{ slug: string }>
}

export default async function TicketSelectionPage({ params }: TicketSelectionPageProps) {
  const { slug } = await params
  const event = getEventBySlug(MOCK_EVENTS, slug)

  if (!event) {
    notFound()
  }

  const zones = getVenueZones()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <TicketSelectionView event={event} zones={zones} />
    </div>
  )
}
