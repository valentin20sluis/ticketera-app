"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"
import { buildTicketStubs } from "@/modules/checkout/utils/build-ticket-stubs"
import { downloadCalendarFile } from "@/modules/checkout/utils/generate-calendar-file"
import { generateTicketsPdf } from "@/modules/checkout/utils/generate-tickets-pdf"
import { getOrderStatus } from "@/modules/my-tickets/utils/get-order-status"
import { getTicketCode } from "@/modules/my-tickets/utils/get-ticket-code"
import {
  formatEventDateBadge,
  formatEventTime,
  formatFullEventDate,
} from "@/modules/events/utils/format-event-date"

interface TicketDetailPanelProps {
  order: ConfirmedOrder
  ticketNumber: number
  onTicketNumberChange: (next: number) => void
}

export function TicketDetailPanel({
  order,
  ticketNumber,
  onTicketNumberChange,
}: TicketDetailPanelProps) {
  const { session } = useAuthSession()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const stubs = buildTicketStubs(order.lines)
  const stub = stubs[ticketNumber - 1]
  const { month, day } = formatEventDateBadge(order.startDate)
  const holderName = session?.fullName ?? session?.email ?? "Invitado"
  const statusLabel = getOrderStatus(order.startDate) === "upcoming" ? "Válida" : "Usada"

  const handleDownloadPdf = async () => {
    const qrElement = panelRef.current?.querySelector<SVGSVGElement>("[data-qr-code] svg")
    if (!qrElement) {
      return
    }

    setIsGeneratingPdf(true)
    try {
      await generateTicketsPdf({ order, stubs: [stub], qrElements: [qrElement] })
    } catch (error) {
      console.error(error)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const realQrCode = order.ticketQrCodes?.[ticketNumber - 1]
  const fullCode = realQrCode ?? getTicketCode(order.orderNumber, ticketNumber)
  const shownCode = realQrCode ? realQrCode.slice(0, 8).toUpperCase() : fullCode

  return (
    <div ref={panelRef}>
      <Card className="pt-0!">
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={order.eventImageUrl}
            alt={order.eventTitle}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute top-3 left-3 flex flex-col items-center rounded-lg bg-background px-2 py-1 text-center leading-none shadow-sm">
            <span className="text-xs font-bold text-cta">{month}</span>
            <span className="text-lg font-bold text-foreground">{day}</span>
          </div>
        </div>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {order.eventTitle}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarIcon className="size-4 shrink-0" />
              <span>
                {formatFullEventDate(order.startDate)}, {formatEventTime(order.startDate)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="size-4 shrink-0" />
              <span>
                {order.venueName}, {order.city}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Entrada {ticketNumber} de {stub.totalTickets}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Entrada anterior"
                disabled={ticketNumber <= 1}
                onClick={() => onTicketNumberChange(ticketNumber - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Entrada siguiente"
                disabled={ticketNumber >= stub.totalTickets}
                onClick={() => onTicketNumberChange(ticketNumber + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div data-qr-code>
              <QRCodeSVG
                value={
                  order.ticketQrCodes?.[ticketNumber - 1] ??
                  `TICKETERA-${order.orderNumber}-${ticketNumber}`
                }
              />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Zona</dt>
                <dd className="font-medium text-foreground">{stub.zoneName}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Asiento</dt>
                <dd className="font-medium text-foreground">Sin asiento asignado</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Titular</dt>
                <dd className="font-medium text-foreground">{holderName}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-medium text-foreground" title={fullCode}>
                  {shownCode}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="font-medium text-foreground">{statusLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
            >
              {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => downloadCalendarFile(order)}
            >
              Agregar al calendario
            </Button>
          </div>

          {order.invoiceUrl && (
            <a
              href={order.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Ver factura
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
