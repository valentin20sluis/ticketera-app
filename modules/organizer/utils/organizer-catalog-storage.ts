import type {
  OrganizerCatalog,
  OrganizerEvent,
  OrganizerEventFunction,
  OrganizerFunctionZone,
  OrganizerVenue,
  OrganizerVenueZone,
} from "@/modules/organizer/types/organizer.types";

const STORAGE_KEY = "ticketera:organizer-catalog";

export function getEmptyCatalog(): OrganizerCatalog {
  return {
    venues: [],
    venueZones: [],
    events: [],
    eventFunctions: [],
    functionZones: [],
  };
}

export function readStoredCatalog(): OrganizerCatalog {
  if (typeof window === "undefined") {
    return getEmptyCatalog();
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return getEmptyCatalog();
  }

  try {
    return JSON.parse(rawValue) as OrganizerCatalog;
  } catch {
    return getEmptyCatalog();
  }
}

export function writeStoredCatalog(catalog: OrganizerCatalog): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // Quota exceeded or serialization error: degrade silently, keep app usable.
  }
}

export function mergeCatalogs(
  base: OrganizerCatalog,
  addition: OrganizerCatalog
): OrganizerCatalog {
  return {
    venues: [...base.venues, ...addition.venues],
    venueZones: [...base.venueZones, ...addition.venueZones],
    events: [...base.events, ...addition.events],
    eventFunctions: [...base.eventFunctions, ...addition.eventFunctions],
    functionZones: [...base.functionZones, ...addition.functionZones],
  };
}

export interface AppendOrganizerEventInput {
  venue: OrganizerVenue | null;
  venueZones: OrganizerVenueZone[];
  event: OrganizerEvent;
  eventFunction: OrganizerEventFunction;
  functionZones: OrganizerFunctionZone[];
}

export function appendOrganizerEvent(
  entry: AppendOrganizerEventInput
): OrganizerCatalog {
  const storedCatalog = readStoredCatalog();

  const updatedCatalog: OrganizerCatalog = {
    venues: entry.venue
      ? [...storedCatalog.venues, entry.venue]
      : storedCatalog.venues,
    venueZones: [...storedCatalog.venueZones, ...entry.venueZones],
    events: [...storedCatalog.events, entry.event],
    eventFunctions: [...storedCatalog.eventFunctions, entry.eventFunction],
    functionZones: [...storedCatalog.functionZones, ...entry.functionZones],
  };

  writeStoredCatalog(updatedCatalog);

  return updatedCatalog;
}
