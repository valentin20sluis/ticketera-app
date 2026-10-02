"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { CURRENT_ORGANIZER } from "@/modules/organizer/data/current-organizer.mock"
import { EventDetailsStep } from "@/modules/organizer/components/EventDetailsStep"
import { FunctionZonesStep } from "@/modules/organizer/components/FunctionZonesStep"
import { VenueStep } from "@/modules/organizer/components/VenueStep"
import { useCreateEventForm, type CreateEventStep } from "@/modules/organizer/hooks/useCreateEventForm"
import { useOrganizerCatalog } from "@/modules/organizer/hooks/useOrganizerCatalog"
import type { OrganizerCatalog } from "@/modules/organizer/types/organizer.types"
import { buildOrganizerEventEntry } from "@/modules/organizer/utils/build-organizer-event-entry"

interface CreateEventWizardProps {
  seedCatalog: OrganizerCatalog
}

const STEP_ORDER: CreateEventStep[] = ["details", "venue", "zones"]
const STEP_LABELS: Record<CreateEventStep, string> = {
  details: "Datos del evento",
  venue: "Venue",
  zones: "Función y zonas",
}

export function CreateEventWizard({ seedCatalog }: CreateEventWizardProps) {
  const router = useRouter()
  const { catalog, addEvent } = useOrganizerCatalog(seedCatalog)
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
  } = useCreateEventForm()

  const stepIndex = STEP_ORDER.indexOf(step)

  function handleBack() {
    const previousStep = STEP_ORDER[stepIndex - 1]
    if (previousStep) {
      goToStep(previousStep)
    }
  }

  function handleContinue() {
    const isValid = validateStep(step)
    if (!isValid) {
      return
    }

    if (step === "zones") {
      const entry = buildOrganizerEventEntry(values, { organizerId: CURRENT_ORGANIZER.id })
      addEvent(entry)
      router.push("/organizador")
      return
    }

    const nextStep = STEP_ORDER[stepIndex + 1]
    if (nextStep) {
      goToStep(nextStep)
    }
  }

  const existingVenues = catalog.venues.filter(
    (venue) => venue.organizerId === CURRENT_ORGANIZER.id
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm font-medium text-muted-foreground">
        Paso {stepIndex + 1} de {STEP_ORDER.length}: {STEP_LABELS[step]}
      </p>

      {step === "details" && (
        <EventDetailsStep
          values={values.details}
          errors={errors}
          onChange={updateDetailsField}
        />
      )}

      {step === "venue" && (
        <VenueStep
          existingVenues={existingVenues}
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

      <div className="flex justify-between">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" onClick={handleBack}>
            Atrás
          </Button>
        ) : (
          <span />
        )}

        <Button type="button" onClick={handleContinue}>
          {step === "zones" ? "Crear evento" : "Continuar"}
        </Button>
      </div>
    </div>
  )
}
