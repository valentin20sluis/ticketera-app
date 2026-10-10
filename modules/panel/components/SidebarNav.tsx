import Link from "next/link";
import { LogOut, SquareArrowOutUpRight, Ticket, User as UserIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelNavSection } from "@/modules/panel/nav-config";

interface SidebarNavProps {
  sections: PanelNavSection[];
  activeHref?: string;
  collapsed: boolean;
  fullName: string;
  roleLabel: string;
  onLogout: () => void;
  className?: string;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function SidebarNav({
  sections,
  activeHref,
  collapsed,
  fullName,
  roleLabel,
  onLogout,
  className,
  onNavigate,
  onClose,
}: SidebarNavProps) {
  return (
    <aside
      aria-label="Menú lateral"
      className={cn(
        "flex flex-col border-r border-gray-200 bg-white p-3 transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[264px]",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-2 pt-1 pb-5">
        <div className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-indigo-600 text-white">
          <Ticket className="size-5" aria-hidden="true" />
        </div>
        {!collapsed && (
          <span className="truncate text-lg font-semibold tracking-tight">Ticketera</span>
        )}
        {onClose && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="ml-auto inline-flex size-9 flex-none items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Menú principal" className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.heading} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="mx-3 mb-3 h-px bg-gray-200" />
            ) : (
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                {section.heading}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = item.href === activeHref;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                    isActive && "bg-indigo-50 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <Icon className="size-5 flex-none" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-4 flex flex-col gap-0.5 border-t border-gray-200 pt-4">
        <Link
          href="/"
          title="Ver sitio"
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            collapsed && "justify-center px-0",
          )}
        >
          <SquareArrowOutUpRight className="size-5 flex-none" aria-hidden="true" />
          {!collapsed && <span>Ver sitio</span>}
        </Link>
        <button
          type="button"
          title="Cerrar sesión"
          onClick={onLogout}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-5 flex-none" aria-hidden="true" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <div className={cn("flex items-center gap-3 px-3 pt-3", collapsed && "justify-center px-0")}>
          <div className="flex size-9 flex-none items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
            <UserIcon className="size-5" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{fullName}</p>
              <p className="truncate text-xs text-gray-500">{roleLabel}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
