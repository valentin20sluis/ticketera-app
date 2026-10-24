import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/shared/DatePicker"
import { Input } from "@/components/ui/input"
import { VenueZoneMap, type VenueZoneMapZone } from "@/modules/events/components/VenueZoneMap"
import type {
  FunctionValues,
  ZoneRowValues,
} from "@/modules/organizer/hooks/useCreateEventForm"
import { DEFAULT_SEAT_CAPACITY } from "@/modules/ticketing/types/seat.types"
import { MAX_EVENT_FUNCTIONS } from "@/modules/organizer/schemas/create-event.schema"
import { buildStackedZoneShape } from "@/modules/organizer/utils/zone-shape"

interface FunctionZonesStepProps {
  functions: FunctionValues[]
  errors: Partial<Record<string, string>>
  onAddFunction: () => void
  onRemoveFunction: (fnIndex: number) => void
  onStartsAtChange: (fnIndex: number, value: string) => void
  onAddZone: (fnIndex: number) => void
  onRemoveZone: (fnIndex: number, zoneIndex: number) => void
  onZoneFieldChange: (
    fnIndex: number,
    zoneIndex: number,
    field: keyof ZoneRowValues,
    value: string
  ) => void
}

export function FunctionZonesStep({
  functions,
  errors,
  onAddFunction,
  onRemoveFunction,
  onStartsAtChange,
  onAddZone,
  onRemoveZone,
  onZoneFieldChange,
}: FunctionZonesStepProps) {
  return (
    <div className="flex flex-col gap-6">
      {functions.map((fn, fnIndex) => {
        const [startDate, startTime = ""] = fn.startsAt.split("T")
        const prefix = `functions.${fnIndex}`
        const previewZones: VenueZoneMapZone[] = fn.zones.map((zone, index) => ({
          id: String(index),
          name: zone.name,
          price: zone.price,
          capacity: DEFAULT_SEAT_CAPACITY,
          available: DEFAULT_SEAT_CAPACITY,
          shape: buildStackedZoneShape(index, fn.zones.length),
          status: "available",
        }))

        return (
          <section
            key={fnIndex}
            aria-label={`Función ${fnIndex + 1}`}
            className="flex flex-col gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Función {fnIndex + 1}</h3>
              <Button
                type="button"
                variant="outline"
                disabled={functions.length === 1}
                onClick={() => onRemoveFunction(fnIndex)}
              >
                Quitar función
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`function-starts-at-${fnIndex}`}
                className="text-sm font-medium text-foreground"
              >
                Fecha y hora de la función
              </label>
              <div className="grid grid-cols-[1fr_8rem] gap-3">
                <DatePicker
                  id={`function-starts-at-${fnIndex}`}
                  value={startDate}
                  onChange={(date) =>
                    onStartsAtChange(fnIndex, date ? `${date}T${startTime || "20:00"}` : "")
                  }
                />
                <Input
                  type="time"
                  aria-label={`Hora de la función ${fnIndex + 1}`}
                  className="h-10"
                  value={startTime}
                  disabled={!startDate}
                  onChange={(event) => onStartsAtChange(fnIndex, `${startDate}T${event.target.value}`)}
                />
              </div>
              {errors[`${prefix}.startsAt`] && (
                <p className="text-sm text-destructive">{errors[`${prefix}.startsAt`]}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-foreground">Zonas</span>

              {fn.zones.map((zone, index) => {
                const zonePrefix = `${prefix}.zones.${index}`
                const id = `${fnIndex}-${index}`
                return (
                  <div key={index} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`zone-name-${id}`} className="text-sm font-medium text-foreground">
                          Nombre
                        </label>
                        <Input
                          className="h-10"
                          id={`zone-name-${id}`}
                          value={zone.name}
                          onChange={(event) =>
                            onZoneFieldChange(fnIndex, index, "name", event.target.value)
                          }
                          placeholder="Platea, General..."
                        />
                        {errors[`${zonePrefix}.name`] && (
                          <p className="text-sm text-destructive">{errors[`${zonePrefix}.name`]}</p>
                        )}
                      </div>


                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`zone-price-${id}`}
                          className="text-sm font-medium text-foreground"
                        >
                          Precio
                        </label>
                        <Input
                          className="h-10"
                          id={`zone-price-${id}`}
                          type="number"
                          value={zone.price}
                          onChange={(event) =>
                            onZoneFieldChange(fnIndex, index, "price", event.target.value)
                          }
                        />
                        {errors[`${zonePrefix}.price`] && (
                          <p className="text-sm text-destructive">{errors[`${zonePrefix}.price`]}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={fn.zones.length === 1}
                      onClick={() => onRemoveZone(fnIndex, index)}
                      className="self-start"
                    >
                      Eliminar
                    </Button>
                  </div>
                )
              })}

              {errors[`${prefix}.zones`] && (
                <p className="text-sm text-destructive">{errors[`${prefix}.zones`]}</p>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={() => onAddZone(fnIndex)}
                className="self-start"
              >
                Agregar zona
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Vista previa</span>
              <VenueZoneMap zones={previewZones} onZoneSelect={() => {}} />
            </div>
          </section>
        )
      })}

      {errors.functions && <p className="text-sm text-destructive">{errors.functions}</p>}

      <Button
        type="button"
        variant="secondary"
        disabled={functions.length >= MAX_EVENT_FUNCTIONS}
        onClick={onAddFunction}
        className="self-start"
      >
        Agregar función
      </Button>
    </div>
  )
}
