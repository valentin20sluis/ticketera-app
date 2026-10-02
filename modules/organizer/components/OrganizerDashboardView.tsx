"use client"

import { OrganizerEventCard } from "@/modules/organizer/components/OrganizerEventCard"
import { useOrganizerCatalog } from "@/modules/organizer/hooks/useOrganizerCatalog"
import type { OrganizerCatalog } from "@/modules/organizer/types/organizer.types"
import { getOrganizerEventSummaries } from "@/modules/organizer/utils/get-organizer-event-summaries"

interface OrganizerDashboardViewProps {
  seedCatalog: OrganizerCatalog
  organizerId: string
}

export function OrganizerDashboardView({
  seedCatalog,
  organizerId,
}: OrganizerDashboardViewProps) {
  const { catalog } = useOrganizerCatalog(seedCatalog)
  const summaries = getOrganizerEventSummaries(catalog, organizerId)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <OrganizerEventCard key={summary.id} summary={summary} />
      ))}
    </div>
  )
}
