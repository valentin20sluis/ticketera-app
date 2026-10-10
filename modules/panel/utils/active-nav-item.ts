import type { PanelNavItem, PanelNavSection } from "@/modules/panel/nav-config";

export interface ActiveNavItem {
  item: PanelNavItem;
  heading: string;
}

// Longest href first, so a parent route (e.g. "/organizador") never
// shadows a more specific one (e.g. "/organizador/eventos/nuevo").
export function findActiveNavItem(
  pathname: string,
  sections: PanelNavSection[],
): ActiveNavItem | undefined {
  const flattened = sections.flatMap((section) =>
    section.items.map((item) => ({ item, heading: section.heading })),
  );
  return flattened
    .sort((a, b) => b.item.href.length - a.item.href.length)
    .find(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
