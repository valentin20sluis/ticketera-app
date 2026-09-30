"use client"

import { formatPrice } from "@/lib/format-currency"
import { BuyerInfoForm } from "@/modules/checkout/components/BuyerInfoForm"
import { CheckoutStepper } from "@/modules/checkout/components/CheckoutStepper"
import { PaymentMethodSection } from "@/modules/checkout/components/PaymentMethodSection"
import { useCheckoutForm } from "@/modules/checkout/hooks/useCheckoutForm"
import { TicketSummary } from "@/modules/events/components/TicketSummary"
import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

interface CheckoutPaymentStepProps {
  lines: TicketSelectionLine[]
  totalQuantity: number
  totalAmount: number
  onConfirm: () => void
}

export function CheckoutPaymentStep({
  lines,
  totalQuantity,
  totalAmount,
  onConfirm,
}: CheckoutPaymentStepProps) {
  const {
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
  } = useCheckoutForm()

  const handlePay = () => {
    if (validate()) {
      onConfirm()
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 pb-28 lg:grid-cols-3 lg:pb-32">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <CheckoutStepper currentStep="payment" />

        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
          Reservamos tus entradas por 10:00
        </p>

        <BuyerInfoForm values={buyer} errors={errors} onChange={updateBuyerField} />

        <PaymentMethodSection
          paymentMethod={paymentMethod}
          card={card}
          termsAccepted={termsAccepted}
          errors={errors}
          onPaymentMethodChange={setPaymentMethod}
          onCardFieldChange={updateCardField}
          onTermsChange={setTermsAccepted}
        />
      </div>

      <div className="lg:col-span-1">
        <TicketSummary
          lines={lines}
          totalQuantity={totalQuantity}
          totalAmount={totalAmount}
          ctaLabel={`Pagar ${formatPrice(totalAmount)}`}
          ctaDisabled={!termsAccepted}
          onCtaClick={handlePay}
        />
      </div>
    </div>
  )
}
