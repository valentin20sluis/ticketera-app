import type { LucideIcon } from "lucide-react"
import { PartyPopperIcon, SearchIcon, TicketIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface HowItWorksStep {
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: HowItWorksStep[] = [
  {
    icon: SearchIcon,
    title: "Busca tu evento",
    description: "Explora cientos de eventos por categoría, ciudad o fecha.",
  },
  {
    icon: TicketIcon,
    title: "Elige tus entradas",
    description: "Selecciona la zona y la cantidad de entradas que necesitas.",
  },
  {
    icon: PartyPopperIcon,
    title: "Disfruta el evento",
    description: "Recibe tus entradas digitales y preséntalas el día del evento.",
  },
]

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="font-heading text-center text-2xl font-semibold text-foreground sm:text-3xl">
        Cómo funciona
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step, stepIndex) => (
          <Card key={step.title} className="items-center text-center">
            <CardContent className="flex flex-col items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <step.icon className="size-6" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Paso {stepIndex + 1}
              </span>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
