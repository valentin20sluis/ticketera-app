"use client"

import { useState } from "react"

import { TicketSelectionView } from "@/modules/events/components/TicketSelectionView"
import { useTicketSelection } from "@/modules/events/hooks/useTicketSelection"
import type { Event } from "@/modules/events/types/event.types"
import type { VenueZone } from "@/modules/events/types/venue-zone.types"
import { CheckoutPaymentStep } from "@/modules/checkout/components/CheckoutPaymentStep"
import { CheckoutStepper } from "@/modules/checkout/components/CheckoutStepper"
import type { CheckoutStep } from "@/modules/checkout/types/checkout.types"

interface CheckoutFlowProps {
  event: Pick<Event, "title" | "slug" | "imageUrl" | "venueName" | "city" | "startDate">
  zones: VenueZone[]
}

export function CheckoutFlow({ event, zones }: CheckoutFlowProps) {
  const selection = useTicketSelection(zones)
  const [step, setStep] = useState<CheckoutStep>("tickets")

  if (step === "payment") {
    return (
      <CheckoutPaymentStep
        lines={selection.lines}
        totalQuantity={selection.totalQuantity}
        totalAmount={selection.totalAmount}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckoutStepper currentStep="tickets" />
      <TicketSelectionView
        event={event}
        zones={zones}
        selection={selection}
        onContinue={() => setStep("payment")}
      />
    </div>
  )
}
