import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/shared/DatePicker"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { VenueZoneMap, type VenueZoneMapZone } from "@/modules/events/components/VenueZoneMap"
import type {
  FunctionZonesValues,
  ZoneRowValues,
} from "@/modules/organizer/hooks/useCreateEventForm"
import { buildStackedZoneShape } from "@/modules/organizer/utils/zone-shape"

const SEAT_INPUTS = [
  { field: "seatRows", label: "Filas (máx. 26)", max: 26 },
  { field: "seatColumns", label: "Asientos por fila (máx. 40)", max: 40 },
] as const

const isNumbered = (zone: ZoneRowValues) =>
  zone.seatRows !== undefined || zone.seatColumns !== undefined

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
  const [startDate, startTime = ""] = values.startsAt.split("T")
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
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <DatePicker
            id="function-starts-at"
            value={startDate}
            onChange={(date) => onStartsAtChange(date ? `${date}T${startTime || "20:00"}` : "")}
          />
          <Input
            type="time"
            aria-label="Hora de la función"
            className="h-10"
            value={startTime}
            disabled={!startDate}
            onChange={(event) => onStartsAtChange(`${startDate}T${event.target.value}`)}
          />
        </div>
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
                <Input className="h-10"
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
                <Input className="h-10"
                  id={`zone-capacity-${index}`}
                  type="number"
                  value={zone.capacity}
                  readOnly={isNumbered(zone)}
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
                <Input className="h-10"
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

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id={`zone-numbered-${index}`}
                  checked={isNumbered(zone)}
                  onCheckedChange={(checked) => {
                    onZoneFieldChange(index, "seatRows", checked ? "1" : "")
                    onZoneFieldChange(index, "seatColumns", checked ? "1" : "")
                  }}
                />
                <label
                  htmlFor={`zone-numbered-${index}`}
                  className="text-sm font-medium text-foreground"
                >
                  Asientos numerados
                </label>
              </div>
              {isNumbered(zone) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SEAT_INPUTS.map(({ field, label, max }) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`zone-${field}-${index}`}
                        className="text-sm font-medium text-foreground"
                      >
                        {label}
                      </label>
                      <Input
                        className="h-10"
                        id={`zone-${field}-${index}`}
                        type="number"
                        min={1}
                        max={max}
                        value={zone[field] ?? ""}
                        onChange={(event) => onZoneFieldChange(index, field, event.target.value)}
                      />
                      {errors[`zones.${index}.${field}`] && (
                        <p className="text-sm text-destructive">
                          {errors[`zones.${index}.${field}`]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
