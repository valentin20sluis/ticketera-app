"use client"

import { useState } from "react"
import Image from "next/image"
import { CalendarIcon, MapPinIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/format-currency"
import { TicketStubCard } from "@/modules/checkout/components/TicketStubCard"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"
import { buildTicketStubs } from "@/modules/checkout/utils/build-ticket-stubs"
import { formatFullEventDate } from "@/modules/events/utils/format-event-date"
import { getOrderStatus } from "@/modules/my-tickets/utils/get-order-status"

interface TicketOrderCardProps {
  order: ConfirmedOrder
}

export function TicketOrderCard({ order }: TicketOrderCardProps) {
  const [expanded, setExpanded] = useState(false)

  const status = getOrderStatus(order.startDate)
  const stubs = buildTicketStubs(order.lines)

  return (
    <Card className="pt-0!">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={order.eventImageUrl}
          alt={order.eventTitle}
          fill
          unoptimized
          className="object-cover"
        />
        <Badge
          variant={status === "upcoming" ? "default" : "secondary"}
          className="absolute top-3 right-3"
        >
          {status === "upcoming" ? "Próximo" : "Pasado"}
        </Badge>
      </div>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {order.eventTitle}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-4 shrink-0" />
            <span>
              {order.venueName}, {order.city}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarIcon className="size-4 shrink-0" />
            <span>{formatFullEventDate(order.startDate)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {order.totalQuantity} {order.totalQuantity !== 1 ? "entradas" : "entrada"}
          </span>
          <span className="font-medium text-foreground">{formatPrice(order.totalAmount)}</span>
        </div>

        <Button variant="outline" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Ocultar entradas" : "Ver entradas"}
        </Button>

        {expanded && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stubs.map((stub) => (
              <TicketStubCard
                key={stub.ticketNumber}
                eventTitle={order.eventTitle}
                eventImageUrl={order.eventImageUrl}
                venueName={order.venueName}
                city={order.city}
                startDate={order.startDate}
                stub={stub}
                qrValue={`TICKETERA-${order.orderNumber}-${stub.ticketNumber}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
