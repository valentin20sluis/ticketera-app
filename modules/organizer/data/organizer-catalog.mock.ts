import { CURRENT_ORGANIZER } from "@/modules/organizer/data/current-organizer.mock";
import type {
  OrganizerCatalog,
  OrganizerEvent,
  OrganizerEventFunction,
  OrganizerFunctionZone,
  OrganizerVenue,
  OrganizerVenueZone,
} from "@/modules/organizer/types/organizer.types";

const SEED_CREATED_AT = "2025-01-15T10:00:00.000Z";

export const MOCK_ORGANIZER_VENUES: OrganizerVenue[] = [
  {
    id: "venue-seed-001",
    organizerId: CURRENT_ORGANIZER.id,
    name: "Arena Lima Centro",
    address: "Av. Javier Prado Este 1234",
    city: "Lima",
    lat: -12.0931,
    lng: -77.0465,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "venue-seed-002",
    organizerId: CURRENT_ORGANIZER.id,
    name: "Teatro Municipal de Arequipa",
    address: "Calle Mercaderes 200",
    city: "Arequipa",
    lat: -16.3989,
    lng: -71.537,
    createdAt: SEED_CREATED_AT,
  },
];

export const MOCK_ORGANIZER_VENUE_ZONES: OrganizerVenueZone[] = [
  {
    id: "venue-zone-seed-001",
    venueId: "venue-seed-001",
    name: "Platea",
    shapeX: 10,
    shapeY: 10,
    shapeWidth: 80,
    shapeHeight: 30,
    capacity: 500,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "venue-zone-seed-002",
    venueId: "venue-seed-001",
    name: "General",
    shapeX: 10,
    shapeY: 45,
    shapeWidth: 80,
    shapeHeight: 40,
    capacity: 1500,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "venue-zone-seed-003",
    venueId: "venue-seed-002",
    name: "Palco",
    shapeX: 10,
    shapeY: 10,
    shapeWidth: 80,
    shapeHeight: 25,
    capacity: 200,
    createdAt: SEED_CREATED_AT,
  },
];

export const MOCK_ORGANIZER_EVENTS: OrganizerEvent[] = [
  {
    id: "event-seed-001",
    organizerId: CURRENT_ORGANIZER.id,
    categoryId: "music",
    venueId: "venue-seed-001",
    slug: "concierto-rock-nacional",
    title: "Concierto de Rock Nacional",
    description:
      "Una noche con las bandas de rock más representativas del circuito nacional, en un show de 3 horas con invitados especiales.",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
    doorsOpenTime: "19:00",
    showStartTime: "20:30",
    minimumAge: "18+",
    admissionType: "General",
    status: "published",
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_CREATED_AT,
  },
  {
    id: "event-seed-002",
    organizerId: CURRENT_ORGANIZER.id,
    categoryId: "theater",
    venueId: "venue-seed-001",
    slug: "obra-el-ultimo-acto",
    title: "El Último Acto",
    description:
      "Una obra de teatro dramática que explora los límites de la memoria y el olvido, con un elenco de primer nivel.",
    imageUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf",
    doorsOpenTime: "18:30",
    showStartTime: "19:30",
    minimumAge: "Todas las edades",
    admissionType: "General",
    status: "draft",
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_CREATED_AT,
  },
  {
    id: "event-seed-003",
    organizerId: CURRENT_ORGANIZER.id,
    categoryId: "sports",
    venueId: "venue-seed-002",
    slug: "torneo-regional-voley",
    title: "Torneo Regional de Vóley",
    description:
      "Fase final del torneo regional de vóley, con los cuatro mejores equipos de la temporada compitiendo por el título.",
    imageUrl: "https://images.unsplash.com/photo-1592656094267-764a45160876",
    doorsOpenTime: "16:00",
    showStartTime: "17:00",
    minimumAge: "Todas las edades",
    admissionType: "General",
    status: "published",
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_CREATED_AT,
  },
];

export const MOCK_ORGANIZER_EVENT_FUNCTIONS: OrganizerEventFunction[] = [
  {
    id: "event-function-seed-001",
    eventId: "event-seed-001",
    startsAt: "2026-03-14T20:30:00.000Z",
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "event-function-seed-002",
    eventId: "event-seed-002",
    startsAt: "2026-04-02T19:30:00.000Z",
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "event-function-seed-003",
    eventId: "event-seed-003",
    startsAt: "2026-05-10T17:00:00.000Z",
    createdAt: SEED_CREATED_AT,
  },
];

export const MOCK_ORGANIZER_FUNCTION_ZONES: OrganizerFunctionZone[] = [
  {
    id: "function-zone-seed-001",
    functionId: "event-function-seed-001",
    venueZoneId: "venue-zone-seed-001",
    price: 180,
    currency: "PEN",
    capacity: 500,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "function-zone-seed-002",
    functionId: "event-function-seed-001",
    venueZoneId: "venue-zone-seed-002",
    price: 90,
    currency: "PEN",
    capacity: 1500,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "function-zone-seed-003",
    functionId: "event-function-seed-002",
    venueZoneId: "venue-zone-seed-001",
    price: 70,
    currency: "PEN",
    capacity: 500,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "function-zone-seed-004",
    functionId: "event-function-seed-003",
    venueZoneId: "venue-zone-seed-003",
    price: 50,
    currency: "PEN",
    capacity: 200,
    createdAt: SEED_CREATED_AT,
  },
];

export const SEED_ORGANIZER_CATALOG: OrganizerCatalog = {
  venues: MOCK_ORGANIZER_VENUES,
  venueZones: MOCK_ORGANIZER_VENUE_ZONES,
  events: MOCK_ORGANIZER_EVENTS,
  eventFunctions: MOCK_ORGANIZER_EVENT_FUNCTIONS,
  functionZones: MOCK_ORGANIZER_FUNCTION_ZONES,
};
