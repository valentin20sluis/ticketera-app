"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { formatPrice } from "@/lib/format-currency"
import { CheckoutStepper } from "@/modules/checkout/components/CheckoutStepper"
import { useCheckoutPayment } from "@/modules/checkout/hooks/useCheckoutPayment"
import { TicketSummary } from "@/modules/events/components/TicketSummary"
import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

interface CheckoutPaymentStepProps {
  lines: TicketSelectionLine[]
  totalQuantity: number
  totalAmount: number
}

export function CheckoutPaymentStep({
  lines,
  totalQuantity,
  totalAmount,
}: CheckoutPaymentStepProps) {
  const { termsAccepted, setTermsAccepted, isLoading, error, pay } = useCheckoutPayment(lines)

  return (
    <div className="grid grid-cols-1 gap-6 pb-28 lg:grid-cols-3 lg:pb-32">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <CheckoutStepper currentStep="payment" />

        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
          Reservamos tus entradas por 10:00. Serás redirigido a Stripe para completar el pago de
          forma segura.
        </p>

        <div className="flex items-center gap-2">
          <Checkbox
            id="terms-accepted"
            checked={termsAccepted}
            onCheckedChange={setTermsAccepted}
          />
          <label htmlFor="terms-accepted" className="text-sm text-foreground">
            Acepto los términos y condiciones
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="lg:col-span-1">
        <TicketSummary
          lines={lines}
          totalQuantity={totalQuantity}
          totalAmount={totalAmount}
          ctaLabel={isLoading ? "Redirigiendo..." : `Pagar ${formatPrice(totalAmount)}`}
          ctaDisabled={!termsAccepted || isLoading}
          onCtaClick={pay}
        />
      </div>
    </div>
  )
}
