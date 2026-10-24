"use client";

import { useCallback, useState } from "react";

import {
  eventDetailsSchema,
  functionsStepSchema,
  MAX_EVENT_FUNCTIONS,
  venueStepSchema,
} from "@/modules/organizer/schemas/create-event.schema";
import type { CreateEventFormValues } from "@/modules/organizer/schemas/create-event.schema";

export type CreateEventStep = "details" | "venue" | "zones";

export type EventDetailsValues = CreateEventFormValues["details"];
export type VenueStepValues = CreateEventFormValues["venue"];
export type NewVenueValues = Extract<VenueStepValues, { mode: "new" }>["venue"];
export type FunctionValues = CreateEventFormValues["functions"][number];
export type ZoneRowValues = FunctionValues["zones"][number];

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

function buildInitialFunction(): FunctionValues {
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
  addFunction: () => void;
  removeFunction: (fnIndex: number) => void;
  updateFunctionStartsAt: (fnIndex: number, value: string) => void;
  addZoneRow: (fnIndex: number) => void;
  removeZoneRow: (fnIndex: number, zoneIndex: number) => void;
  updateZoneRow: (
    fnIndex: number,
    zoneIndex: number,
    field: keyof ZoneRowValues,
    value: string
  ) => void;
  goToStep: (step: CreateEventStep) => void;
  validateStep: (step: CreateEventStep) => boolean;
}

export function useCreateEventForm(initialValues?: CreateEventFormValues): UseCreateEventFormResult {
  const [step, setStep] = useState<CreateEventStep>("details");
  const [details, setDetails] = useState<EventDetailsValues>(() => initialValues?.details ?? buildInitialDetails());
  const [venue, setVenue] = useState<VenueStepValues>(() => initialValues?.venue ?? buildInitialVenue());
  const [functions, setFunctions] = useState<FunctionValues[]>(
    () => initialValues?.functions ?? [buildInitialFunction()]
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

  const updateFunction = useCallback(
    (fnIndex: number, update: (fn: FunctionValues) => FunctionValues) => {
      setFunctions((current) => current.map((fn, i) => (i === fnIndex ? update(fn) : fn)));
    },
    []
  );

  const addFunction = useCallback(() => {
    setFunctions((current) =>
      current.length >= MAX_EVENT_FUNCTIONS ? current : [...current, buildInitialFunction()]
    );
  }, []);

  const removeFunction = useCallback((fnIndex: number) => {
    setFunctions((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== fnIndex)
    );
  }, []);

  const updateFunctionStartsAt = useCallback(
    (fnIndex: number, value: string) => {
      updateFunction(fnIndex, (fn) => ({ ...fn, startsAt: value }));
    },
    [updateFunction]
  );

  const addZoneRow = useCallback(
    (fnIndex: number) => {
      updateFunction(fnIndex, (fn) => ({ ...fn, zones: [...fn.zones, buildInitialZoneRow()] }));
    },
    [updateFunction]
  );

  const removeZoneRow = useCallback(
    (fnIndex: number, zoneIndex: number) => {
      updateFunction(fnIndex, (fn) =>
        fn.zones.length === 1
          ? fn
          : { ...fn, zones: fn.zones.filter((_, i) => i !== zoneIndex) }
      );
    },
    [updateFunction]
  );

  const updateZoneRow = useCallback(
    (fnIndex: number, zoneIndex: number, field: keyof ZoneRowValues, value: string) => {
      updateFunction(fnIndex, (fn) => ({
        ...fn,
        zones: fn.zones.map((zone, i) => {
          if (i !== zoneIndex) {
            return zone;
          }

          const nextValue = NUMERIC_ZONE_FIELDS.has(field) ? Number(value) : value;
          return { ...zone, [field]: nextValue } as ZoneRowValues;
        }),
      }));
    },
    [updateFunction]
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
            : functionsStepSchema.safeParse(functions);

      if (result.success) {
        setErrors({});
        return true;
      }

      const nextErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const path = targetStep === "zones" ? ["functions", ...issue.path] : issue.path;
        nextErrors[path.join(".")] = issue.message;
      }
      setErrors(nextErrors);
      return false;
    },
    [details, venue, functions]
  );

  return {
    step,
    values: { details, venue, functions },
    errors,
    updateDetailsField,
    setVenueMode,
    setExistingVenueId,
    updateNewVenueField,
    addFunction,
    removeFunction,
    updateFunctionStartsAt,
    addZoneRow,
    removeZoneRow,
    updateZoneRow,
    goToStep,
    validateStep,
  };
}
