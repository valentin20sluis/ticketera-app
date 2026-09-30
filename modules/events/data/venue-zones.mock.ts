import type { VenueZone } from "@/modules/events/types/venue-zone.types";

export const MOCK_VENUE_ZONES: VenueZone[] = [
  {
    id: "campo-vip",
    name: "Campo VIP",
    price: 250,
    capacity: 500,
    available: 120,
    shape: { x: 30, y: 12, width: 40, height: 18 },
  },
  {
    id: "campo-general",
    name: "Campo General",
    price: 150,
    capacity: 1500,
    available: 800,
    shape: { x: 20, y: 32, width: 60, height: 20 },
  },
  {
    id: "tribuna-occidente",
    name: "Tribuna Occidente",
    price: 120,
    capacity: 600,
    available: 0,
    shape: { x: 2, y: 12, width: 16, height: 55 },
  },
  {
    id: "tribuna-oriente",
    name: "Tribuna Oriente",
    price: 120,
    capacity: 600,
    available: 340,
    shape: { x: 82, y: 12, width: 16, height: 55 },
  },
  {
    id: "tribuna-norte",
    name: "Tribuna Norte",
    price: 90,
    capacity: 900,
    available: 500,
    shape: { x: 20, y: 55, width: 60, height: 20 },
  },
];
