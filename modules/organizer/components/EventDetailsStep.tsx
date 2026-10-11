import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { EventDetailsValues } from "@/modules/organizer/hooks/useCreateEventForm"

export interface CategoryOption {
  id: string
  name: string
}

interface EventDetailsStepProps {
  categories: CategoryOption[]
  values: EventDetailsValues
  errors: Partial<Record<string, string>>
  onChange: (field: keyof EventDetailsValues, value: string) => void
}

export function EventDetailsStep({ categories, values, errors, onChange }: EventDetailsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-title" className="text-sm font-medium text-foreground">
          Título
        </label>
        <Input
          id="event-title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Nombre del evento"
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-description" className="text-sm font-medium text-foreground">
          Descripción
        </label>
        <Input
          id="event-description"
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Describe el evento"
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-image-url" className="text-sm font-medium text-foreground">
          URL de imagen
        </label>
        <Input
          id="event-image-url"
          value={values.imageUrl}
          onChange={(event) => onChange("imageUrl", event.target.value)}
          placeholder="https://..."
        />
        {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-doors-open-time" className="text-sm font-medium text-foreground">
            Apertura de puertas
          </label>
          <Input
            id="event-doors-open-time"
            value={values.doorsOpenTime}
            onChange={(event) => onChange("doorsOpenTime", event.target.value)}
            placeholder="HH:MM"
          />
          {errors.doorsOpenTime && (
            <p className="text-sm text-destructive">{errors.doorsOpenTime}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-show-start-time" className="text-sm font-medium text-foreground">
            Inicio del show
          </label>
          <Input
            id="event-show-start-time"
            value={values.showStartTime}
            onChange={(event) => onChange("showStartTime", event.target.value)}
            placeholder="HH:MM"
          />
          {errors.showStartTime && (
            <p className="text-sm text-destructive">{errors.showStartTime}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-minimum-age" className="text-sm font-medium text-foreground">
            Edad mínima
          </label>
          <Input
            id="event-minimum-age"
            value={values.minimumAge}
            onChange={(event) => onChange("minimumAge", event.target.value)}
            placeholder="Todo público"
          />
          {errors.minimumAge && (
            <p className="text-sm text-destructive">{errors.minimumAge}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-admission-type" className="text-sm font-medium text-foreground">
            Tipo de admisión
          </label>
          <Input
            id="event-admission-type"
            value={values.admissionType}
            onChange={(event) => onChange("admissionType", event.target.value)}
            placeholder="General en pie"
          />
          {errors.admissionType && (
            <p className="text-sm text-destructive">{errors.admissionType}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Categoría</span>
        <RadioGroup
          value={values.categoryId}
          onValueChange={(value) => onChange("categoryId", String(value))}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {categories.map((category) => {
            const inputId = `event-category-${category.id}`

            return (
              <div key={category.id} className="flex items-center gap-2">
                <RadioGroupItem id={inputId} value={category.id} />
                <label htmlFor={inputId} className="text-sm text-foreground">
                  {category.name}
                </label>
              </div>
            )
          })}
        </RadioGroup>
        {errors.categoryId && (
          <p className="text-sm text-destructive">{errors.categoryId}</p>
        )}
      </div>
    </div>
  )
}
