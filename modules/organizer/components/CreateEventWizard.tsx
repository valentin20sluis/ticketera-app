"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  createEventAction,
  updateEventAction,
  type EventActionState,
} from "@/modules/organizer/actions/event.actions"
import { EventDetailsStep, type CategoryOption } from "@/modules/organizer/components/EventDetailsStep"
import { FunctionZonesStep } from "@/modules/organizer/components/FunctionZonesStep"
import { VenueStep, type VenueOption } from "@/modules/organizer/components/VenueStep"
import { useCreateEventForm, type CreateEventStep } from "@/modules/organizer/hooks/useCreateEventForm"
import type { CreateEventFormValues } from "@/modules/organizer/schemas/create-event.schema"

interface OwnerOption {
  id: string
  name: string
  email: string
}

interface CreateEventWizardProps {
  categories: CategoryOption[]
  venues: VenueOption[]
  // Admin flow: the organizer who will own (and publish) the event. Absent for organizers.
  owners?: OwnerOption[]
  // Edit mode: the event id and its current values. Without them the wizard creates.
  edit?: { eventId: string; values: CreateEventFormValues; structureLocked: boolean }
}

const ALL_STEPS: CreateEventStep[] = ["details", "venue", "zones"]
const STEP_LABELS: Record<CreateEventStep, string> = {
  details: "Datos del evento",
  venue: "Venue",
  zones: "Función y zonas",
}

export function CreateEventWizard({ categories, venues, owners, edit }: CreateEventWizardProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string>()
  const [ownerId, setOwnerId] = useState("")
  const [ownerError, setOwnerError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const {
    step,
    values,
    errors,
    updateDetailsField,
    setVenueMode,
    setExistingVenueId,
    updateNewVenueField,
    updateFunctionStartsAt,
    addZoneRow,
    removeZoneRow,
    updateZoneRow,
    goToStep,
    validateStep,
  } = useCreateEventForm(edit?.values)

  // With orders on the event the server only accepts detail changes.
  const steps = edit?.structureLocked ? ALL_STEPS.slice(0, 1) : ALL_STEPS
  const stepIndex = steps.indexOf(step)
  const isLastStep = stepIndex === steps.length - 1

  function handleBack() {
    const previousStep = steps[stepIndex - 1]
    if (previousStep) {
      goToStep(previousStep)
    }
  }

  function submit() {
    startTransition(async () => {
      const state: EventActionState = edit
        ? await updateEventAction(edit.eventId, values)
        : await createEventAction(values, ownerId)
      if (state.error) {
        setSubmitError(state.error)
        return
      }
      router.push("/organizador")
      router.refresh()
    })
  }

  function handleOwnerChange(id: string) {
    setOwnerId(id)
    setOwnerError(undefined)
    // Venues belong to one organizer, so a previous pick no longer applies.
    setVenueMode("new")
  }

  function handleContinue() {
    if (step === "details" && owners && !edit && !ownerId) {
      setOwnerError("Elige un organizador")
      return
    }
    if (!validateStep(step)) {
      return
    }

    if (isLastStep) {
      setSubmitError(undefined)
      submit()
      return
    }

    goToStep(steps[stepIndex + 1])
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm font-medium text-muted-foreground">
        Paso {stepIndex + 1} de {steps.length}: {STEP_LABELS[step]}
      </p>

      {edit?.structureLocked && (
        <div role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Este evento ya tiene pedidos (o varias funciones): solo puedes editar sus datos. El venue,
          la fecha, las zonas y los precios están bloqueados.
        </div>
      )}

      {step === "details" && owners && !edit && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-owner" className="text-sm font-medium text-foreground">
            Organizador
          </label>
          <Select
            items={owners.map((o) => ({ value: o.id, label: `${o.name} (${o.email})` }))}
            value={ownerId || null}
            onValueChange={(value) => handleOwnerChange(value ?? "")}
          >
            <SelectTrigger id="event-owner" className="h-10 w-full" aria-invalid={Boolean(ownerError)}>
              <SelectValue placeholder="Elegir organizador" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name} ({o.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ownerError && <p className="text-sm text-destructive">{ownerError}</p>}
        </div>
      )}

      {step === "details" && (
        <EventDetailsStep
          categories={categories}
          values={values.details}
          errors={errors}
          onChange={updateDetailsField}
        />
      )}

      {step === "venue" && (
        <VenueStep
          existingVenues={owners ? venues.filter((v) => v.organizerId === ownerId) : venues}
          values={values.venue}
          errors={errors}
          onModeChange={setVenueMode}
          onExistingVenueChange={setExistingVenueId}
          onNewVenueFieldChange={updateNewVenueField}
        />
      )}

      {step === "zones" && (
        <FunctionZonesStep
          values={values.functionZones}
          errors={errors}
          onStartsAtChange={updateFunctionStartsAt}
          onAddZone={addZoneRow}
          onRemoveZone={removeZoneRow}
          onZoneFieldChange={updateZoneRow}
        />
      )}

      <div aria-live="polite">
        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      </div>

      <div className="flex justify-between">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" onClick={handleBack} disabled={pending}>
            Atrás
          </Button>
        ) : (
          <span />
        )}

        <Button type="button" onClick={handleContinue} disabled={pending}>
          {isLastStep ? (edit ? "Guardar cambios" : owners ? "Guardar borrador" : "Crear evento") : "Continuar"}
        </Button>
      </div>
    </div>
  )
}
