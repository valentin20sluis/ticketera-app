import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type {
  NewVenueValues,
  VenueStepValues,
} from "@/modules/organizer/hooks/useCreateEventForm"
export interface VenueOption {
  id: string
  name: string
  city: string
}

interface VenueStepProps {
  existingVenues: VenueOption[]
  values: VenueStepValues
  errors: Partial<Record<string, string>>
  onModeChange: (mode: VenueStepValues["mode"]) => void
  onExistingVenueChange: (venueId: string) => void
  onNewVenueFieldChange: (field: keyof NewVenueValues, value: string) => void
}

export function VenueStep({
  existingVenues,
  values,
  errors,
  onModeChange,
  onExistingVenueChange,
  onNewVenueFieldChange,
}: VenueStepProps) {
  const radioValue = values.mode === "existing" ? values.venueId : "new"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Venue</span>
        <RadioGroup
          value={radioValue}
          onValueChange={(value) => {
            const stringValue = String(value)
            if (stringValue === "new") {
              onModeChange("new")
              return
            }

            onModeChange("existing")
            onExistingVenueChange(stringValue)
          }}
          className="flex flex-col gap-2"
        >
          {existingVenues.map((venue) => {
            const inputId = `venue-option-${venue.id}`

            return (
              <div key={venue.id} className="flex items-center gap-2">
                <RadioGroupItem id={inputId} value={venue.id} />
                <label htmlFor={inputId} className="text-sm text-foreground">
                  {venue.name}, {venue.city}
                </label>
              </div>
            )
          })}
          <div className="flex items-center gap-2">
            <RadioGroupItem id="venue-option-new" value="new" />
            <label htmlFor="venue-option-new" className="text-sm text-foreground">
              Crear nuevo venue
            </label>
          </div>
        </RadioGroup>
        {errors.venueId && <p className="text-sm text-destructive">{errors.venueId}</p>}
      </div>

      {values.mode === "new" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-venue-name" className="text-sm font-medium text-foreground">
              Nombre
            </label>
            <Input
              id="new-venue-name"
              value={values.venue.name}
              onChange={(event) => onNewVenueFieldChange("name", event.target.value)}
              placeholder="Nombre del venue"
            />
            {errors["venue.name"] && (
              <p className="text-sm text-destructive">{errors["venue.name"]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-venue-address" className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <Input
              id="new-venue-address"
              value={values.venue.address}
              onChange={(event) => onNewVenueFieldChange("address", event.target.value)}
              placeholder="Dirección"
            />
            {errors["venue.address"] && (
              <p className="text-sm text-destructive">{errors["venue.address"]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-venue-city" className="text-sm font-medium text-foreground">
              Ciudad
            </label>
            <Input
              id="new-venue-city"
              value={values.venue.city}
              onChange={(event) => onNewVenueFieldChange("city", event.target.value)}
              placeholder="Ciudad"
            />
            {errors["venue.city"] && (
              <p className="text-sm text-destructive">{errors["venue.city"]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-venue-lat" className="text-sm font-medium text-foreground">
                Latitud
              </label>
              <Input
                id="new-venue-lat"
                type="number"
                value={values.venue.lat}
                onChange={(event) => onNewVenueFieldChange("lat", event.target.value)}
              />
              {errors["venue.lat"] && (
                <p className="text-sm text-destructive">{errors["venue.lat"]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-venue-lng" className="text-sm font-medium text-foreground">
                Longitud
              </label>
              <Input
                id="new-venue-lng"
                type="number"
                value={values.venue.lng}
                onChange={(event) => onNewVenueFieldChange("lng", event.target.value)}
              />
              {errors["venue.lng"] && (
                <p className="text-sm text-destructive">{errors["venue.lng"]}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
