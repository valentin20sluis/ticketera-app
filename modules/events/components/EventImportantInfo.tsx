import { Card, CardContent } from "@/components/ui/card"
import type { Event } from "@/modules/events/types/event.types"
import { Clock, DoorOpen, Ticket, UserCheck, type LucideIcon } from "lucide-react"

type EventImportantInfoProps = Pick<
  Event,
  "doorsOpenTime" | "showStartTime" | "minimumAge" | "admissionType"
>

const INFO_ITEMS: Array<{
  label: string
  key: keyof EventImportantInfoProps
  icon: LucideIcon
}> = [
  { label: "Apertura de puertas", key: "doorsOpenTime", icon: DoorOpen },
  { label: "Inicio del show", key: "showStartTime", icon: Clock },
  { label: "Edad mínima", key: "minimumAge", icon: UserCheck },
  { label: "Tipo de ingreso", key: "admissionType", icon: Ticket },
]

export function EventImportantInfo(props: EventImportantInfoProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Información importante
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {INFO_ITEMS.map((item) => (
          <Card key={item.key} size="sm">
            <CardContent className="flex flex-row items-center gap-3">
              <item.icon className="size-5 shrink-0 text-brand" />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">
                  {props[item.key]}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
