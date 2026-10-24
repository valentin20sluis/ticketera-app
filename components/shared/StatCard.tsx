import type { LucideIcon } from "lucide-react"

export function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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
