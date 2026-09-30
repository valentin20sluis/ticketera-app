"use client"

import { useState } from "react"

import { TicketSelectionView } from "@/modules/events/components/TicketSelectionView"
import { useTicketSelection } from "@/modules/events/hooks/useTicketSelection"
import type { Event } from "@/modules/events/types/event.types"
import type { VenueZone } from "@/modules/events/types/venue-zone.types"
import { CheckoutPaymentStep } from "@/modules/checkout/components/CheckoutPaymentStep"
import { CheckoutConfirmationStep } from "@/modules/checkout/components/CheckoutConfirmationStep"
import { CheckoutStepper } from "@/modules/checkout/components/CheckoutStepper"
import type { CheckoutStep, ConfirmedOrder } from "@/modules/checkout/types/checkout.types"
import { generateOrderNumber } from "@/modules/checkout/utils/generate-order-number"

interface CheckoutFlowProps {
  event: Pick<Event, "title" | "slug" | "imageUrl" | "venueName" | "city" | "startDate">
  zones: VenueZone[]
}

export function CheckoutFlow({ event, zones }: CheckoutFlowProps) {
  const selection = useTicketSelection(zones)
  const [step, setStep] = useState<CheckoutStep>("tickets")
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null)

  const handleContinue = () => setStep("payment")

  const handleConfirm = () => {
    setConfirmedOrder({
      orderNumber: generateOrderNumber(),
      eventTitle: event.title,
      eventImageUrl: event.imageUrl,
      venueName: event.venueName,
      city: event.city,
      startDate: event.startDate,
      lines: selection.lines,
      totalQuantity: selection.totalQuantity,
      totalAmount: selection.totalAmount,
    })
    setStep("confirmation")
  }

  if (step === "payment") {
    return (
      <CheckoutPaymentStep
        lines={selection.lines}
        totalQuantity={selection.totalQuantity}
        totalAmount={selection.totalAmount}
        onConfirm={handleConfirm}
      />
    )
  }

  if (step === "confirmation" && confirmedOrder) {
    return <CheckoutConfirmationStep order={confirmedOrder} />
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckoutStepper currentStep="tickets" />
      <TicketSelectionView
        event={event}
        zones={zones}
        selection={selection}
        onContinue={handleContinue}
      />
    </div>
  )
}
