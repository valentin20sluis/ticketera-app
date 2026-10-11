import { notFound } from "next/navigation"
import { connection } from "next/server"

import { getDb } from "@/lib/db/client"

import { EventAboutSection } from "@/modules/events/components/EventAboutSection"
import { EventDetailHero } from "@/modules/events/components/EventDetailHero"
import { EventImportantInfo } from "@/modules/events/components/EventImportantInfo"
import { EventTicketSidebar } from "@/modules/events/components/EventTicketSidebar"
import { RelatedEventsSection } from "@/modules/events/components/RelatedEventsSection"
import { getEventBySlug, getRelatedEvents } from "@/modules/events/services/event.service"
import { listPublicEvents } from "@/modules/events/services/list-public-events.service"

interface EventDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  await connection()
  const { slug } = await params
  const events = await listPublicEvents(await getDb())
  const event = getEventBySlug(events, slug)

  if (!event) {
    notFound()
  }

  const relatedEvents = getRelatedEvents(events, event)

  return (
    <>
      <EventDetailHero event={event} />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <EventAboutSection description={event.description} />
          <EventImportantInfo
            doorsOpenTime={event.doorsOpenTime}
            showStartTime={event.showStartTime}
            minimumAge={event.minimumAge}
            admissionType={event.admissionType}
          />
        </div>
        <div className="lg:col-span-1">
          <EventTicketSidebar event={event} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <RelatedEventsSection events={relatedEvents} />
      </div>
    </>
  )
}
