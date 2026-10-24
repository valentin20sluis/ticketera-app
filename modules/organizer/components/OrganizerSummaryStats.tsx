import { BadgeCheckIcon, TicketIcon, WalletIcon } from "lucide-react"

import { StatCard } from "@/components/shared/StatCard"
import { formatPrice } from "@/lib/format-currency"

interface OrganizerSummaryStatsProps {
  totalTicketsSold: number
  totalRevenue: number
  publishedEventsCount: number
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
