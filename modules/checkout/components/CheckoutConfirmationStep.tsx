"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckoutStepper } from "@/modules/checkout/components/CheckoutStepper"
import { TicketStubCard } from "@/modules/checkout/components/TicketStubCard"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"
import { buildTicketStubs } from "@/modules/checkout/utils/build-ticket-stubs"
import { downloadCalendarFile } from "@/modules/checkout/utils/generate-calendar-file"
import { generateTicketsPdf } from "@/modules/checkout/utils/generate-tickets-pdf"

interface CheckoutConfirmationStepProps {
  order: ConfirmedOrder
}

const INFO_CARDS = [
  {
    title: "Revisa tu correo",
    description: "Te enviamos el detalle de tu compra y tus entradas.",
  },
  {
    title: "Muestra tu QR",
    description: "Presenta el código QR de cada entrada en el ingreso al evento.",
  },
  {
    title: "Todo en Mis entradas",
    description: "Encuentra tus entradas cuando quieras desde tu cuenta.",
  },
] as const

export function CheckoutConfirmationStep({ order }: CheckoutConfirmationStepProps) {
  const stubs = buildTicketStubs(order.lines)
  const gridRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    const qrElements = Array.from(
      gridRef.current?.querySelectorAll<SVGSVGElement>("[data-qr-code] svg") ?? []
    )

    setIsGeneratingPdf(true)
    try {
      await generateTicketsPdf({ order, stubs, qrElements })
    } catch (error) {
      console.error(error)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckoutStepper currentStep="confirmation" />

      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2Icon className="size-12 text-primary" />
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          ¡Compra confirmada!
        </h1>
        <p className="text-sm text-muted-foreground">Número de pedido: {order.orderNumber}</p>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          nativeButton={false}
          render={<Link href="/mis-entradas" />}
        >
          Ver mis entradas
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => downloadCalendarFile(order)}
        >
          Agregar al calendario
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={isGeneratingPdf}
          onClick={handleDownloadPdf}
        >
          {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {INFO_CARDS.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
