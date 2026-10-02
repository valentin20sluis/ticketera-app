import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { MapPinIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/format-currency"
import { formatFullEventDate } from "@/modules/events/utils/format-event-date"
import type { TicketStub } from "@/modules/checkout/utils/build-ticket-stubs"

interface TicketStubCardProps {
  eventTitle: string
  eventImageUrl: string
  venueName: string
  city: string
  startDate: string
  stub: TicketStub
  qrValue: string
}

export function TicketStubCard({
  eventTitle,
  eventImageUrl,
  venueName,
  city,
  startDate,
  stub,
  qrValue,
}: TicketStubCardProps) {
  return (
    <Card className="pt-0!">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={eventImageUrl}
          alt={eventTitle}
          fill
          unoptimized
          className="object-cover"
        />
      </div>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {eventTitle}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-4 shrink-0" />
            <span>
              {venueName}, {city}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatFullEventDate(startDate)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{stub.zoneName}</span>
          <span className="font-medium text-foreground">{formatPrice(stub.price)}</span>
        </div>

        <div className="border-t border-dashed border-border" />

        <div className="flex flex-col items-center gap-2">
          <div data-qr-code>
            <QRCodeSVG value={qrValue} />
          </div>
          <span className="text-sm text-muted-foreground">
            Entrada {stub.ticketNumber} de {stub.totalTickets}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
