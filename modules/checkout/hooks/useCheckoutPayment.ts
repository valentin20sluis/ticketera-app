"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { requestCheckoutUrl } from "@/modules/checkout/services/request-checkout-url.service"
import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

const ERROR_MESSAGES = {
  insufficient_stock:
    "No hay cupo suficiente para tu selección. Ajusta las cantidades e inténtalo de nuevo.",
  unknown: "No pudimos iniciar el pago. Inténtalo nuevamente.",
}

export function useCheckoutPayment(lines: TicketSelectionLine[]) {
  const router = useRouter()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setIsLoading(true)
    setError(null)
    const result = await requestCheckoutUrl({
      items: lines.map((line) => ({ functionZoneId: line.zoneId, quantity: line.quantity })),
    })

    if (result.ok) {
      window.location.assign(result.url)
      return
    }
    if (result.error === "unauthorized") {
      router.push("/ingresar")
      return
    }
    setError(ERROR_MESSAGES[result.error])
    setIsLoading(false)
  }

  return { termsAccepted, setTermsAccepted, isLoading, error, pay }
}
