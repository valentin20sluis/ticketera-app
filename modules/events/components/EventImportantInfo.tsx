import { Card, CardContent } from "@/components/ui/card"
import type { Event } from "@/modules/events/types/event.types"

type EventImportantInfoProps = Pick<
  Event,
  "doorsOpenTime" | "showStartTime" | "minimumAge" | "admissionType"
>

const INFO_ITEMS: Array<{ label: string; key: keyof EventImportantInfoProps }> = [
  { label: "Apertura de puertas", key: "doorsOpenTime" },
  { label: "Inicio del show", key: "showStartTime" },
  { label: "Edad mínima", key: "minimumAge" },
  { label: "Tipo de ingreso", key: "admissionType" },
]

export function EventImportantInfo(props: EventImportantInfoProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Información importante
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INFO_ITEMS.map((item) => (
          <Card key={item.key} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">
                {props[item.key]}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
