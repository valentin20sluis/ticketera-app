import { BadgeCheckIcon, PercentIcon, TicketIcon, WalletIcon } from "lucide-react"

import { StatCard } from "@/components/shared/StatCard"
import { formatPrice } from "@/lib/format-currency"
import type { EventStatus } from "@/modules/organizer/utils/event-permissions"
import { ROLE_LABELS } from "@/modules/users/constants"
import type { UserRole } from "@/modules/users/types/user.types"

// ponytail: local type; swap for PlatformSummary from get-platform-summary.service once T1 lands.
interface PlatformSummaryStatsProps {
  summary: {
    usersByRole: Record<UserRole, number>
    activeOrganizers: number
    eventsByStatus: Record<EventStatus, number>
    ticketsSold: number
    grossRevenue: number
    platformFee: number | null
  }
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  cancelled: "Cancelado",
  suspended: "Suspendido",
}

const fmt = (n: number) => n.toLocaleString("es-PE")

function BreakdownCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5">
      <span className="text-sm text-gray-500">{title}</span>
      <ul className="flex flex-col gap-1">
        {rows.map(([label, count]) => (
          <li key={label} className="flex items-center justify-between text-gray-900">
            <span>{label}</span>
            <span className="font-semibold">{fmt(count)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PlatformSummaryStats({ summary }: PlatformSummaryStatsProps) {
  const { usersByRole, eventsByStatus } = summary
  return (
    <div className="flex flex-wrap gap-4">
      <StatCard icon={TicketIcon} label="Entradas vendidas" value={fmt(summary.ticketsSold)} />
      <StatCard icon={WalletIcon} label="Ingresos brutos" value={formatPrice(summary.grossRevenue)} />
      <StatCard
        icon={PercentIcon}
        label="Comisión de plataforma"
        value={summary.platformFee === null ? "No disponible" : formatPrice(summary.platformFee)}
      />
      <StatCard icon={BadgeCheckIcon} label="Organizadores activos" value={fmt(summary.activeOrganizers)} />
      <BreakdownCard
        title="Usuarios por rol"
        rows={(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => [ROLE_LABELS[r], usersByRole[r]])}
      />
      <BreakdownCard
        title="Eventos por estado"
        rows={(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => [STATUS_LABELS[s], eventsByStatus[s]])}
      />
    </div>
  )
}
