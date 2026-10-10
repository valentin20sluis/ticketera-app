import {
  BadgeCheck,
  BarChart3,
  Calendar,
  LayoutDashboard,
  type LucideIcon,
  PlusCircle,
  ScanLine,
  Users,
  Wallet,
} from "lucide-react";

export interface PanelNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface PanelNavSection {
  heading: string;
  items: PanelNavItem[];
}

// Admin pages beyond Usuarios are placeholders for now (see the stub pages);
// kept here so the sidebar matches the approved design in full.
export const ADMIN_NAV_ITEMS: PanelNavItem[] = [
  { href: "/super-admin", label: "Dashboard", icon: BarChart3 },
  { href: "/super-admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/super-admin/organizadores", label: "Organizadores", icon: BadgeCheck },
];

export const ORGANIZER_NAV_ITEMS: PanelNavItem[] = [
  { href: "/organizador/resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/organizador", label: "Mis eventos", icon: Calendar },
  { href: "/organizador/eventos/nuevo", label: "Crear evento", icon: PlusCircle },
  { href: "/organizador/check-in", label: "Check-in", icon: ScanLine },
  { href: "/organizador/pagos", label: "Pagos", icon: Wallet },
];
