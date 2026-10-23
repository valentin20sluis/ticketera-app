import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { OrganizerPayments } from "@/modules/organizer/services/get-organizer-payments.service"
import type { ConnectState } from "@/modules/payments/utils/connect-status"

export type PaymentsPeriod = "todo" | "30d"

const ACCOUNT_LABEL: Record<ConnectState, string> = {
  not_connected: "Sin conectar",
  pending: "Pendiente",
  active: "Activa",
}

const PERIODS: { value: PaymentsPeriod; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "30d", label: "Últimos 30 días" },
]

const dateFormat = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "medium",
  timeStyle: "short",
})

interface OrganizerPaymentsViewProps {
  data: OrganizerPayments
  connectState: ConnectState
  period: PaymentsPeriod
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[160px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white p-5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
    </div>
  )
}

export function OrganizerPaymentsView({ data, connectState, period }: OrganizerPaymentsViewProps) {
  const { totals, payments } = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Pagos</h1>
        <p className="text-sm text-gray-500">Tus cobros y el estado de tu cuenta de Stripe.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <span className="text-sm text-gray-500">Cuenta de pagos:</span>
        <Badge variant={connectState === "active" ? "default" : "secondary"}>
          {ACCOUNT_LABEL[connectState]}
        </Badge>
        {connectState !== "active" && (
          <Link
            href="/organizador/configuracion"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ir a configuración
          </Link>
        )}
      </div>

      <nav aria-label="Período" className="flex gap-2">
        {PERIODS.map(({ value, label }) => (
          <Link
            key={value}
            href={`/organizador/pagos?periodo=${value}`}
            aria-current={value === period ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              value === period
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-4">
        <Stat label="Bruto" value={formatPrice(totals.gross)} />
        <Stat label="Comisión" value={formatPrice(totals.fee)} />
        <Stat label="Neto" value={formatPrice(totals.net)} />
        <Stat label="Nº de cobros" value={totals.orders.toLocaleString("es-PE")} />
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-medium text-gray-900">Aún no tienes cobros</p>
          <p className="text-sm text-gray-500">Las órdenes pagadas de tus eventos aparecerán aquí.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.orderId}>
                  <TableCell className="font-mono text-xs">{p.orderId.slice(0, 8)}</TableCell>
                  <TableCell>{p.eventTitle}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.gross)}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.fee)}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.net)}</TableCell>
                  <TableCell className="whitespace-nowrap">{dateFormat.format(p.paidAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
