"use client"

import { useCallback, useState } from "react"

import { checkoutFormSchema } from "@/modules/checkout/schemas/checkout.schema"
import type {
  BuyerInfo,
  CardDetails,
  PaymentMethod,
} from "@/modules/checkout/types/checkout.types"

function buildInitialBuyer(): BuyerInfo {
  return {
    fullName: "",
    email: "",
    documentType: "dni",
    documentNumber: "",
    phone: "",
  }
}

function buildInitialCard(): CardDetails {
  return {
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  }
}

export interface UseCheckoutFormResult {
  buyer: BuyerInfo
  card: CardDetails
  paymentMethod: PaymentMethod
  termsAccepted: boolean
  errors: Partial<Record<string, string>>
  updateBuyerField: (field: keyof BuyerInfo, value: string) => void
  updateCardField: (field: keyof CardDetails, value: string) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setTermsAccepted: (accepted: boolean) => void
  validate: () => boolean
}

export function useCheckoutForm(): UseCheckoutFormResult {
  const [buyer, setBuyer] = useState<BuyerInfo>(buildInitialBuyer)
  const [card, setCard] = useState<CardDetails>(buildInitialCard)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const updateBuyerField = useCallback((field: keyof BuyerInfo, value: string) => {
    setBuyer((current) => ({ ...current, [field]: value }))
  }, [])

  const updateCardField = useCallback((field: keyof CardDetails, value: string) => {
    setCard((current) => ({ ...current, [field]: value }))
  }, [])

  const validate = useCallback((): boolean => {
    const payload =
      paymentMethod === "card"
        ? { paymentMethod, buyer, card, termsAccepted }
        : { paymentMethod, buyer, termsAccepted }

    const result = checkoutFormSchema.safeParse(payload)

    if (result.success) {
      setErrors({})
      return true
    }

    const nextErrors: Partial<Record<string, string>> = {}
    for (const issue of result.error.issues) {
      nextErrors[issue.path.join(".")] = issue.message
    }
    setErrors(nextErrors)
    return false
  }, [paymentMethod, buyer, card, termsAccepted])

  return {
    buyer,
    card,
    paymentMethod,
    termsAccepted,
    errors,
    updateBuyerField,
    updateCardField,
    setPaymentMethod,
    setTermsAccepted,
    validate,
  }
}
