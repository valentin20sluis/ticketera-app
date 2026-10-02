import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VenueZoneMap, type VenueZoneMapZone } from "@/modules/events/components/VenueZoneMap"
import type {
  FunctionZonesValues,
  ZoneRowValues,
} from "@/modules/organizer/hooks/useCreateEventForm"
import { buildStackedZoneShape } from "@/modules/organizer/utils/build-organizer-event-entry"

interface FunctionZonesStepProps {
  values: FunctionZonesValues
  errors: Partial<Record<string, string>>
  onStartsAtChange: (value: string) => void
  onAddZone: () => void
  onRemoveZone: (index: number) => void
  onZoneFieldChange: (index: number, field: keyof ZoneRowValues, value: string) => void
}

export function FunctionZonesStep({
  values,
  errors,
  onStartsAtChange,
  onAddZone,
  onRemoveZone,
  onZoneFieldChange,
}: FunctionZonesStepProps) {
  const previewZones: VenueZoneMapZone[] = values.zones.map((zone, index) => ({
    id: String(index),
    name: zone.name,
    price: zone.price,
    capacity: zone.capacity,
    available: zone.capacity,
    shape: buildStackedZoneShape(index, values.zones.length),
    status: "available",
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="function-starts-at" className="text-sm font-medium text-foreground">
          Fecha y hora de la función
        </label>
        <Input
          id="function-starts-at"
          type="datetime-local"
          value={values.startsAt}
          onChange={(event) => onStartsAtChange(event.target.value)}
        />
        {errors.startsAt && <p className="text-sm text-destructive">{errors.startsAt}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-foreground">Zonas</span>

        {values.zones.map((zone, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`zone-name-${index}`}
                  className="text-sm font-medium text-foreground"
                >
                  Nombre
                </label>
                <Input
                  id={`zone-name-${index}`}
                  value={zone.name}
                  onChange={(event) => onZoneFieldChange(index, "name", event.target.value)}
                  placeholder="Platea, General..."
                />
                {errors[`zones.${index}.name`] && (
                  <p className="text-sm text-destructive">{errors[`zones.${index}.name`]}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`zone-capacity-${index}`}
                  className="text-sm font-medium text-foreground"
                >
                  Capacidad
                </label>
                <Input
                  id={`zone-capacity-${index}`}
                  type="number"
                  value={zone.capacity}
                  onChange={(event) =>
                    onZoneFieldChange(index, "capacity", event.target.value)
                  }
                />
                {errors[`zones.${index}.capacity`] && (
                  <p className="text-sm text-destructive">
                    {errors[`zones.${index}.capacity`]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`zone-price-${index}`}
                  className="text-sm font-medium text-foreground"
                >
                  Precio
                </label>
                <Input
                  id={`zone-price-${index}`}
                  type="number"
                  value={zone.price}
                  onChange={(event) => onZoneFieldChange(index, "price", event.target.value)}
                />
                {errors[`zones.${index}.price`] && (
                  <p className="text-sm text-destructive">{errors[`zones.${index}.price`]}</p>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={values.zones.length === 1}
              onClick={() => onRemoveZone(index)}
              className="self-start"
            >
              Eliminar
            </Button>
          </div>
        ))}

        {errors.zones && <p className="text-sm text-destructive">{errors.zones}</p>}

        <Button type="button" variant="secondary" onClick={onAddZone} className="self-start">
          Agregar zona
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Vista previa</span>
        <VenueZoneMap zones={previewZones} onZoneSelect={() => {}} />
      </div>
    </div>
  )
}
