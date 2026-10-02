import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock";
import type {
  OrganizerCatalog,
  OrganizerEventSummary,
} from "@/modules/organizer/types/organizer.types";

export function getOrganizerEventSummaries(
  catalog: OrganizerCatalog,
  organizerId: string
): OrganizerEventSummary[] {
  return catalog.events
    .filter((event) => event.organizerId === organizerId)
    .map((event) => {
      const category = MOCK_CATEGORIES.find((item) => item.id === event.categoryId);
      const venue = catalog.venues.find((item) => item.id === event.venueId);
      const eventFunction = catalog.eventFunctions.find(
        (item) => item.eventId === event.id
      );
      const functionZones = eventFunction
        ? catalog.functionZones.filter(
            (zone) => zone.functionId === eventFunction.id
          )
        : [];

      return {
        id: event.id,
        title: event.title,
        imageUrl: event.imageUrl,
        status: event.status,
        categoryName: category?.name ?? "",
        venueName: venue?.name ?? "",
        city: venue?.city ?? "",
        startsAt: eventFunction?.startsAt ?? null,
        zonesCount: functionZones.length,
        totalCapacity: functionZones.reduce((sum, zone) => sum + zone.capacity, 0),
      };
    });
}
