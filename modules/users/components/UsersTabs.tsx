import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildUserListHref, type UserListParams } from "@/modules/users/schemas/user-list-params.schema";
import type { countUsersByTab } from "@/modules/users/services/user-admin.service";

type Counts = Awaited<ReturnType<typeof countUsersByTab>>;

const TABS = [
  { key: "all", label: "Todos", filters: { rol: undefined, estado: undefined } },
  { key: "customer", label: "Clientes", filters: { rol: "customer", estado: undefined } },
  { key: "organizer", label: "Organizadores", filters: { rol: "organizer", estado: undefined } },
  { key: "admin", label: "Administradores", filters: { rol: "admin", estado: undefined } },
  { key: "suspended", label: "Suspendidos", filters: { rol: undefined, estado: "suspendido" } },
] as const satisfies readonly {
  key: keyof Counts;
  label: string;
  filters: Pick<UserListParams, "rol" | "estado">;
}[];

export function UsersTabs({ params, counts }: { params: UserListParams; counts: Counts }) {
  return (
    <nav aria-label="Filtrar usuarios por tipo" className="flex flex-wrap gap-2">
      {TABS.map(({ key, label, filters }) => {
        const active = params.rol === filters.rol && params.estado === filters.estado;
        return (
          <Link
            key={key}
            href={buildUserListHref(params, filters)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                active ? "bg-brand-foreground/20" : "bg-muted text-muted-foreground",
              )}
            >
              {counts[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
