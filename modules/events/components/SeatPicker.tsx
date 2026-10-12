import { cn } from "@/lib/utils"
import type { SeatLayout, SeatRef } from "@/modules/ticketing/types/seat.types"
import { formatSeat, seatLabel } from "@/modules/ticketing/utils/seat-label"

interface SeatPickerProps {
  layout: SeatLayout
  takenSeats?: SeatRef[]
  selectedSeats: SeatRef[]
  onToggle: (seat: SeatRef) => void
}

const LEGEND = [
  { label: "Disponible", className: "border bg-background" },
  { label: "Ocupado", className: "bg-muted opacity-50" },
  { label: "Seleccionado", className: "bg-primary" },
]

export function SeatPicker({
  layout,
  takenSeats = [],
  selectedSeats,
  onToggle,
}: SeatPickerProps) {
  const has = (list: SeatRef[], row: number, number: number) =>
    list.some((seat) => seat.row === row && seat.number === number)

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="mx-auto grid w-max gap-1"
          style={{ gridTemplateColumns: `auto repeat(${layout.columns}, 2rem)` }}
        >
          {Array.from({ length: layout.rows }, (_, r) => {
            const row = r + 1
            return [
              <span
                key={`label-${row}`}
                aria-hidden="true"
                className="flex items-center pr-2 text-xs font-medium text-muted-foreground"
              >
                {seatLabel({ row, number: 1 }).replace(/\d+$/, "")}
              </span>,
              ...Array.from({ length: layout.columns }, (_, c) => {
                const seat = { row, number: c + 1 }
                const taken = has(takenSeats, row, seat.number)
                const selected = has(selectedSeats, row, seat.number)
                return (
                  <button
                    key={`${row}-${seat.number}`}
                    type="button"
                    disabled={taken}
                    aria-pressed={selected}
                    aria-label={`${formatSeat(seat)}, ${taken ? "ocupado" : "disponible"}`}
                    onClick={() => onToggle(seat)}
                    className={cn(
                      "size-8 rounded-md border text-[10px] font-medium transition-colors",
                      taken && "cursor-not-allowed bg-muted opacity-50",
                      !taken && !selected && "bg-background hover:bg-muted",
                      selected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {seat.number}
                  </button>
                )
              }),
            ]
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {LEGEND.map(({ label, className }) => (
          <div key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("size-3.5 rounded-sm", className)} />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
