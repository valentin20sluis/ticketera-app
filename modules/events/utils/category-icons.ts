import { Baby, Music, PartyPopper, Presentation, Tag, Theater, Trophy, type LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  music: Music,
  sports: Trophy,
  theater: Theater,
  festivals: PartyPopper,
  conferences: Presentation,
  family: Baby,
};

export function getCategoryIcon(iconKey: string): LucideIcon {
  return CATEGORY_ICONS[iconKey] ?? Tag;
}
