export const EVENT_CATEGORIES = [
  { value: "concerts", label: "Conciertos" },
  { value: "sports", label: "Deportes" },
  { value: "theater", label: "Teatro" },
  { value: "festivals", label: "Festivales" },
  { value: "family", label: "Familia" },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]["value"];

export type EventCategoryFilter = "all" | EventCategory;

export type EventStatus = "available" | "low-stock" | "sold-out";

export interface TicketEvent {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  imageSrc: string;
  imageAlt: string;
  startsAt: string;
  venue: string;
  city: string;
  minPrice: number;
  status: EventStatus;
  featured: boolean;
}
