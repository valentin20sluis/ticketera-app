import { Circle } from "lucide-react";
import { describe, expect, it } from "vitest";
import type { PanelNavSection } from "@/modules/panel/nav-config";
import { findActiveNavItem } from "./active-nav-item";

const sections: PanelNavSection[] = [
  {
    heading: "Administración",
    items: [
      { href: "/super-admin", label: "Dashboard", icon: Circle },
      { href: "/super-admin/usuarios", label: "Usuarios", icon: Circle },
    ],
  },
  {
    heading: "Organizador",
    items: [
      { href: "/organizador", label: "Mis eventos", icon: Circle },
      { href: "/organizador/eventos/nuevo", label: "Crear evento", icon: Circle },
    ],
  },
];

describe("findActiveNavItem", () => {
  it("matches the exact parent route without a trailing child segment", () => {
    expect(findActiveNavItem("/organizador", sections)?.item.label).toBe("Mis eventos");
  });

  it("prefers the longer, more specific route over its parent", () => {
    expect(findActiveNavItem("/organizador/eventos/nuevo", sections)?.item.label).toBe(
      "Crear evento",
    );
  });

  it("matches nested paths under an item (e.g. a dynamic sub-route)", () => {
    expect(findActiveNavItem("/super-admin/usuarios/123", sections)?.item.label).toBe("Usuarios");
  });

  it("returns undefined when nothing matches", () => {
    expect(findActiveNavItem("/mis-entradas", sections)).toBeUndefined();
  });

  it("keeps the right heading attached to the match", () => {
    expect(findActiveNavItem("/super-admin", sections)?.heading).toBe("Administración");
  });
});
