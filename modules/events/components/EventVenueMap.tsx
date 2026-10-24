import { MapPin } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Event } from "@/modules/events/types/event.types"
import { getVenueMapLinks } from "@/modules/events/services/venue-map.service"

type EventVenueMapProps = Pick<
  Event,
  "venueName" | "venueAddress" | "city" | "venueLat" | "venueLng"
>

export function EventVenueMap({
  venueName,
  venueAddress,
  city,
  venueLat,
  venueLng,
}: EventVenueMapProps) {
  const links = getVenueMapLinks(venueLat, venueLng)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold text-foreground">Ubicación</h2>
      <Card size="sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 shrink-0 text-brand" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">{venueName}</span>
              <span className="text-sm text-muted-foreground">
                {[venueAddress, city].filter(Boolean).join(", ")}
              </span>
            </div>
          </div>
          {links && (
            <>
              <iframe
                src={links.embedUrl}
                title={`Mapa de ${venueName}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-64 w-full rounded-lg border-0 sm:h-80"
              />
              <a
                href={links.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "self-start" })}
              >
                Cómo llegar
              </a>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
