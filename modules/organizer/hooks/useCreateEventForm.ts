"use client";

import { useCallback, useState } from "react";

import {
  eventDetailsSchema,
  functionZonesStepSchema,
  venueStepSchema,
} from "@/modules/organizer/schemas/create-event.schema";
import type { CreateEventFormValues } from "@/modules/organizer/utils/build-organizer-event-entry";

export type CreateEventStep = "details" | "venue" | "zones";

export type EventDetailsValues = CreateEventFormValues["details"];
export type VenueStepValues = CreateEventFormValues["venue"];
export type NewVenueValues = Extract<VenueStepValues, { mode: "new" }>["venue"];
export type FunctionZonesValues = CreateEventFormValues["functionZones"];
export type ZoneRowValues = FunctionZonesValues["zones"][number];

function buildInitialDetails(): EventDetailsValues {
  return {
    title: "",
    description: "",
    categoryId: "",
    imageUrl: "",
    doorsOpenTime: "",
    showStartTime: "",
    minimumAge: "",
    admissionType: "",
  };
}

function buildInitialZoneRow(): ZoneRowValues {
  return { name: "", capacity: 0, price: 0 };
}

function buildInitialVenue(): VenueStepValues {
  return { mode: "existing", venueId: "" };
}

function buildInitialFunctionZones(): FunctionZonesValues {
  return { startsAt: "", zones: [buildInitialZoneRow()] };
}

const NUMERIC_VENUE_FIELDS = new Set<keyof NewVenueValues>(["lat", "lng"]);
const NUMERIC_ZONE_FIELDS = new Set<keyof ZoneRowValues>(["capacity", "price"]);

export interface UseCreateEventFormResult {
  step: CreateEventStep;
  values: CreateEventFormValues;
  errors: Partial<Record<string, string>>;
  updateDetailsField: (field: keyof EventDetailsValues, value: string) => void;
  setVenueMode: (mode: VenueStepValues["mode"]) => void;
  setExistingVenueId: (venueId: string) => void;
  updateNewVenueField: (field: keyof NewVenueValues, value: string) => void;
  updateFunctionStartsAt: (value: string) => void;
  addZoneRow: () => void;
  removeZoneRow: (index: number) => void;
  updateZoneRow: (index: number, field: keyof ZoneRowValues, value: string) => void;
  goToStep: (step: CreateEventStep) => void;
  validateStep: (step: CreateEventStep) => boolean;
}

export function useCreateEventForm(): UseCreateEventFormResult {
  const [step, setStep] = useState<CreateEventStep>("details");
  const [details, setDetails] = useState<EventDetailsValues>(buildInitialDetails);
  const [venue, setVenue] = useState<VenueStepValues>(buildInitialVenue);
  const [functionZones, setFunctionZones] = useState<FunctionZonesValues>(
    buildInitialFunctionZones
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const updateDetailsField = useCallback(
    (field: keyof EventDetailsValues, value: string) => {
      setDetails((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const setVenueMode = useCallback((mode: VenueStepValues["mode"]) => {
    setVenue(
      mode === "existing"
        ? { mode: "existing", venueId: "" }
        : {
            mode: "new",
            venue: { name: "", address: "", city: "", lat: 0, lng: 0 },
          }
    );
  }, []);

  const setExistingVenueId = useCallback((venueId: string) => {
    setVenue((current) =>
      current.mode === "existing" ? { ...current, venueId } : current
    );
  }, []);

  const updateNewVenueField = useCallback(
    (field: keyof NewVenueValues, value: string) => {
      setVenue((current) => {
        if (current.mode !== "new") {
          return current;
        }

        const nextValue = NUMERIC_VENUE_FIELDS.has(field) ? Number(value) : value;
        const updatedVenue = {
          ...current.venue,
          [field]: nextValue,
        } as NewVenueValues;

        return { ...current, venue: updatedVenue };
      });
    },
    []
  );

  const updateFunctionStartsAt = useCallback((value: string) => {
    setFunctionZones((current) => ({ ...current, startsAt: value }));
  }, []);

  const addZoneRow = useCallback(() => {
    setFunctionZones((current) => ({
      ...current,
      zones: [...current.zones, buildInitialZoneRow()],
    }));
  }, []);

  const removeZoneRow = useCallback((index: number) => {
    setFunctionZones((current) => {
      if (current.zones.length === 1) {
        return current;
      }

      return {
        ...current,
        zones: current.zones.filter((_, zoneIndex) => zoneIndex !== index),
      };
    });
  }, []);

  const updateZoneRow = useCallback(
    (index: number, field: keyof ZoneRowValues, value: string) => {
      setFunctionZones((current) => ({
        ...current,
        zones: current.zones.map((zone, zoneIndex) => {
          if (zoneIndex !== index) {
            return zone;
          }

          const nextValue = NUMERIC_ZONE_FIELDS.has(field) ? Number(value) : value;
          return { ...zone, [field]: nextValue } as ZoneRowValues;
        }),
      }));
    },
    []
  );

  const goToStep = useCallback((nextStep: CreateEventStep) => {
    setStep(nextStep);
  }, []);

  const validateStep = useCallback(
    (targetStep: CreateEventStep): boolean => {
      const result =
        targetStep === "details"
          ? eventDetailsSchema.safeParse(details)
          : targetStep === "venue"
            ? venueStepSchema.safeParse(venue)
            : functionZonesStepSchema.safeParse(functionZones);

      if (result.success) {
        setErrors({});
        return true;
      }

      const nextErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        nextErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(nextErrors);
      return false;
    },
    [details, venue, functionZones]
  );

  return {
    step,
    values: { details, venue, functionZones },
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
  };
}
