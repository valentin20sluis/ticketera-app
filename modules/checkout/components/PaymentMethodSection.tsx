import { BanknoteIcon, CreditCardIcon, SmartphoneIcon } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import type { CardDetails, PaymentMethod } from "@/modules/checkout/types/checkout.types"

interface PaymentMethodOption {
  value: PaymentMethod
  label: string
  icon: typeof CreditCardIcon
}

const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { value: "card", label: "Tarjeta", icon: CreditCardIcon },
  { value: "yape", label: "Yape", icon: SmartphoneIcon },
  { value: "pagoefectivo", label: "PagoEfectivo", icon: BanknoteIcon },
]

interface PaymentMethodSectionProps {
  paymentMethod: PaymentMethod
  card: CardDetails
  termsAccepted: boolean
  errors: Partial<Record<string, string>>
  onPaymentMethodChange: (method: PaymentMethod) => void
  onCardFieldChange: (field: keyof CardDetails, value: string) => void
  onTermsChange: (accepted: boolean) => void
}

export function PaymentMethodSection({
  paymentMethod,
  card,
  termsAccepted,
  errors,
  onPaymentMethodChange,
  onCardFieldChange,
  onTermsChange,
}: PaymentMethodSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Método de pago
      </h3>

      <RadioGroup
        value={paymentMethod}
        onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
        className="grid grid-cols-3 gap-3"
      >
        {PAYMENT_METHOD_OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = option.value === paymentMethod
          const inputId = `payment-method-${option.value}`

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors",
                isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              <Icon className="size-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <RadioGroupItem id={inputId} value={option.value} className="sr-only" />
            </label>
          )
        })}
      </RadioGroup>

      {paymentMethod === "card" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-number" className="text-sm font-medium text-foreground">
              Número de tarjeta
            </label>
            <Input
              id="card-number"
              value={card.cardNumber}
              onChange={(event) => onCardFieldChange("cardNumber", event.target.value)}
              placeholder="0000 0000 0000 0000"
            />
            {errors["card.cardNumber"] && (
              <p className="text-sm text-destructive">{errors["card.cardNumber"]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="card-expiry" className="text-sm font-medium text-foreground">
                Vencimiento
              </label>
              <Input
                id="card-expiry"
                value={card.expiry}
                onChange={(event) => onCardFieldChange("expiry", event.target.value)}
                placeholder="MM/AA"
              />
              {errors["card.expiry"] && (
                <p className="text-sm text-destructive">{errors["card.expiry"]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="card-cvv" className="text-sm font-medium text-foreground">
                CVV
              </label>
              <Input
                id="card-cvv"
                value={card.cvv}
                onChange={(event) => onCardFieldChange("cvv", event.target.value)}
                placeholder="123"
              />
              {errors["card.cvv"] && (
                <p className="text-sm text-destructive">{errors["card.cvv"]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-name" className="text-sm font-medium text-foreground">
              Nombre en la tarjeta
            </label>
            <Input
              id="card-name"
              value={card.cardholderName}
              onChange={(event) => onCardFieldChange("cardholderName", event.target.value)}
              placeholder="Como figura en la tarjeta"
            />
            {errors["card.cardholderName"] && (
              <p className="text-sm text-destructive">{errors["card.cardholderName"]}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="terms-accepted"
            checked={termsAccepted}
            onCheckedChange={onTermsChange}
          />
          <label htmlFor="terms-accepted" className="text-sm text-foreground">
            Acepto los términos y condiciones
          </label>
        </div>
        {errors["termsAccepted"] && (
          <p className="text-sm text-destructive">{errors["termsAccepted"]}</p>
        )}
      </div>
    </div>
  )
}
