"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { ROLE_LABELS } from "@/modules/users/constants";
import type { UserRole } from "@/modules/users/types/user.types";
import { ADMIN_NAV_ITEMS, ORGANIZER_NAV_ITEMS, type PanelNavSection } from "@/modules/panel/nav-config";
import { findActiveNavItem } from "@/modules/panel/utils/active-nav-item";
import { SidebarNav } from "@/modules/panel/components/SidebarNav";

const SIDEBAR_COLLAPSED_KEY = "panel-sidebar-collapsed";

const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    collapsedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

interface PanelShellProps {
  role: UserRole;
  fullName: string;
  children: React.ReactNode;
}

export function PanelShell({ role, fullName, children }: PanelShellProps) {
  const pathname = usePathname();
  const { logout } = useAuthSession();
  // Server snapshot is false, so the server-rendered markup never mismatches.
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // Remembering the path where the menu was opened closes it on any navigation.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const mobileOpen = openedAt === pathname;
  const setMobileOpen = (open: boolean) => setOpenedAt(open ? pathname : null);

  function toggleCollapsed() {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {
      // Private mode or blocked storage: nothing to persist.
    }
    collapsedListeners.forEach((listener) => listener());
  }

  // The Administración section only has a real page behind Usuarios today;
  // gate it to super_admin until admin gets its own pages (see nav-config).
  const showAdmin = role === "super_admin";
  const sections: PanelNavSection[] = [
    ...(showAdmin ? [{ heading: "Administración", items: ADMIN_NAV_ITEMS }] : []),
    { heading: "Organizador", items: ORGANIZER_NAV_ITEMS },
  ];
  const active = findActiveNavItem(pathname, sections);
  const roleLabel = ROLE_LABELS[role];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav
        sections={sections}
        activeHref={active?.item.href}
        collapsed={collapsed}
        fullName={fullName}
        roleLabel={roleLabel}
        onLogout={logout}
        className="hidden lg:flex"
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarNav
            sections={sections}
            activeHref={active?.item.href}
            collapsed={false}
            fullName={fullName}
            roleLabel={roleLabel}
            onLogout={logout}
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
            className="absolute inset-y-0 left-0 shadow-2xl"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-15 flex-none items-center gap-1 border-b border-gray-200 bg-white px-3">
          <button
            type="button"
            aria-label="Abrir menú"
            className="inline-flex size-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            className="hidden size-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:inline-flex"
            onClick={toggleCollapsed}
          >
            <PanelLeft className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 truncate px-2 text-sm text-gray-500">
            <span className="hidden sm:inline">
              {active?.heading ?? "Panel"} <span aria-hidden="true">/</span>{" "}
            </span>
            <span className="font-medium text-gray-900">{active?.item.label ?? "Panel"}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
