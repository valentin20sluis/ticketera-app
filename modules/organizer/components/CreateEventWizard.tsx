"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
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

interface CreateEventWizardProps {
  categories: CategoryOption[]
  venues: VenueOption[]
  // Edit mode: the event id and its current values. Without them the wizard creates.
  edit?: { eventId: string; values: CreateEventFormValues; structureLocked: boolean }
}

const ALL_STEPS: CreateEventStep[] = ["details", "venue", "zones"]
const STEP_LABELS: Record<CreateEventStep, string> = {
  details: "Datos del evento",
  venue: "Venue",
  zones: "Función y zonas",
}

export function CreateEventWizard({ categories, venues, edit }: CreateEventWizardProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string>()
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
        : await createEventAction(values)
      if (state.error) {
        setSubmitError(state.error)
        return
      }
      router.push("/organizador")
      router.refresh()
    })
  }

  function handleContinue() {
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
          existingVenues={venues}
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
          {isLastStep ? (edit ? "Guardar cambios" : "Crear evento") : "Continuar"}
        </Button>
      </div>
    </div>
  )
}
