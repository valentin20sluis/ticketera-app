import { BadgeCheckIcon, TicketIcon, WalletIcon, type LucideIcon } from "lucide-react"

import { formatPrice } from "@/lib/format-currency"

interface OrganizerSummaryStatsProps {
  totalTicketsSold: number
  totalRevenue: number
  publishedEventsCount: number
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-[200px] flex-1 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
      </div>
    </div>
  )
}

export function OrganizerSummaryStats({
  totalTicketsSold,
  totalRevenue,
  publishedEventsCount,
}: OrganizerSummaryStatsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <StatCard
        icon={TicketIcon}
        label="Entradas vendidas"
        value={totalTicketsSold.toLocaleString("es-PE")}
      />
      <StatCard icon={WalletIcon} label="Ingresos" value={formatPrice(totalRevenue)} />
      <StatCard
        icon={BadgeCheckIcon}
        label="Eventos publicados"
        value={publishedEventsCount.toLocaleString("es-PE")}
      />
    </div>
  )
}
