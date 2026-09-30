"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { getZoneMaxQuantity } from "@/modules/events/services/venue-zone.service"
import type { UseTicketSelectionResult } from "@/modules/events/hooks/useTicketSelection"
import { VenueZoneMap } from "@/modules/events/components/VenueZoneMap"
import { ZoneSelectorList } from "@/modules/events/components/ZoneSelectorList"
import { TicketSummary } from "@/modules/events/components/TicketSummary"
import type { Event } from "@/modules/events/types/event.types"
import type { VenueZone } from "@/modules/events/types/venue-zone.types"

interface TicketSelectionViewProps {
  event: Pick<Event, "title" | "slug">
  zones: VenueZone[]
  selection: UseTicketSelectionResult
  onContinue: () => void
}

export function TicketSelectionView({
  event,
  zones,
  selection,
  onContinue,
}: TicketSelectionViewProps) {
  const {
    activeZoneId,
    quantities,
    lines,
    totalQuantity,
    totalAmount,
    selectZone,
    increment,
    decrement,
    getZoneStatus,
  } = selection

  const zonesWithStatus = zones.map((zone) => ({
    ...zone,
    status: getZoneStatus(zone.id),
  }))

  const zonesWithQuantity = zonesWithStatus.map((zone) => ({
    ...zone,
    quantity: quantities[zone.id] ?? 0,
    maxQuantity: getZoneMaxQuantity(zone),
  }))

  return (
    <div className="grid grid-cols-1 gap-6 pb-28 lg:grid-cols-3 lg:pb-32">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="flex flex-col gap-2">
          <Link
            href={`/eventos/${event.slug}`}
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Volver al evento
          </Link>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {event.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecciona tu zona y la cantidad de entradas.
          </p>
        </div>

        <VenueZoneMap zones={zonesWithStatus} onZoneSelect={selectZone} />

        <ZoneSelectorList
          zones={zonesWithQuantity}
          activeZoneId={activeZoneId}
          onIncrement={increment}
          onDecrement={decrement}
        />
      </div>

      <div className="lg:col-span-1">
        <TicketSummary
          lines={lines}
          totalQuantity={totalQuantity}
          totalAmount={totalAmount}
          onCtaClick={onContinue}
        />
      </div>
    </div>
  )
}
