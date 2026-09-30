import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { CheckoutStep } from "@/modules/checkout/types/checkout.types"

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "tickets", label: "Entradas" },
  { id: "payment", label: "Datos y pago" },
  { id: "confirmation", label: "Confirmación" },
]

interface CheckoutStepperProps {
  currentStep: CheckoutStep
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep)

  return (
    <ol className="flex w-full items-center">
      {STEPS.map((step, index) => {
        const status =
          index < currentIndex ? "completed" : index === currentIndex ? "current" : "pending"

        return (
          <li key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  status === "completed" && "bg-primary text-primary-foreground",
                  status === "current" && "border-2 border-primary text-primary",
                  status === "pending" && "border border-input text-muted-foreground"
                )}
              >
                {status === "completed" ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm whitespace-nowrap",
                  status === "completed" && "text-foreground",
                  status === "current" && "font-medium text-foreground",
                  status === "pending" && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px flex-1",
                  index < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
