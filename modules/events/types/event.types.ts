import type { LucideIcon } from "lucide-react";

export type EventStatus = "available" | "last-tickets" | "sold-out";

export type EventCategoryColorKey =
  | "pink"
  | "blue"
  | "purple"
  | "orange"
  | "green"
  | "yellow";

export interface EventCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  colorKey: EventCategoryColorKey;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  description: string;
  venueName: string;
  city: string;
  startDate: string;
  imageUrl: string;
  priceFrom: number;
  currency: "PEN";
  status: EventStatus;
  featured: boolean;
}
