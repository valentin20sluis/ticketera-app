import { XIcon } from "lucide-react"

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
  { label: "Disponible", className: "bg-muted-foreground/30" },
  { label: "Ocupado", className: "bg-foreground/10" },
  { label: "Tu selección", className: "bg-primary shadow-[0_0_8px] shadow-primary/60" },
]

export function SeatPicker({
  layout,
  takenSeats = [],
  selectedSeats,
  onToggle,
}: SeatPickerProps) {
  const has = (list: SeatRef[], row: number, number: number) =>
    list.some((seat) => seat.row === row && seat.number === number)

  // Aisle splits the columns in two blocks, like a cinema hall.
  const leftColumns = Math.ceil(layout.columns / 2)
  const rightColumns = layout.columns - leftColumns
  const gridTemplateColumns = [
    "auto",
    `repeat(${leftColumns}, max-content)`,
    rightColumns > 0 ? "1.5rem" : "",
    rightColumns > 0 ? `repeat(${rightColumns}, max-content)` : "",
    "auto",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-gradient-to-b from-muted/60 to-transparent px-3 pt-6 pb-4 sm:px-6">
      <div className="flex flex-col items-center gap-2" aria-hidden="true">
        <div className="h-1.5 w-4/5 max-w-md rounded-[50%/100%] bg-primary shadow-[0_10px_36px_4px] shadow-primary/50" />
        <div className="h-8 w-3/5 max-w-sm bg-gradient-to-b from-primary/20 to-transparent [clip-path:polygon(0_0,100%_0,92%_100%,8%_100%)]" />
        <span className="text-xs tracking-widest text-muted-foreground uppercase">
          Escenario
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="mx-auto grid w-max items-center gap-x-1.5 gap-y-2"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: layout.rows }, (_, r) => {
            const row = r + 1
            const rowLabel = seatLabel({ row, number: 1 }).replace(/\d+$/, "")
            const rowLabelCell = (side: "start" | "end") => (
              <span
                key={`label-${side}-${row}`}
                aria-hidden="true"
                className={cn(
                  "w-5 text-xs font-medium text-muted-foreground",
                  side === "start" ? "text-right" : "text-left",
                )}
              >
                {rowLabel}
              </span>
            )

            const seats = Array.from({ length: layout.columns }, (_, c) => {
              const seat = { row, number: c + 1 }
              const taken = has(takenSeats, row, seat.number)
              const selected = has(selectedSeats, row, seat.number)
              const seatButton = (
                <button
                  key={`${row}-${seat.number}`}
                  type="button"
                  disabled={taken}
                  aria-pressed={selected}
                  aria-label={`${formatSeat(seat)}, ${taken ? "ocupado" : "disponible"}`}
                  onClick={() => onToggle(seat)}
                  className={cn(
                    "relative flex size-7 items-start justify-center rounded-t-lg rounded-b-sm pt-1 text-[10px] font-medium transition-all outline-none sm:size-8",
                    "after:absolute after:inset-x-0.5 after:bottom-0.5 after:h-1.5 after:rounded-sm after:bg-black/20",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    taken && "cursor-not-allowed bg-foreground/10 text-muted-foreground/60",
                    !taken &&
                      !selected &&
                      "bg-muted-foreground/30 text-foreground hover:-translate-y-0.5 hover:bg-primary/50",
                    selected &&
                      "-translate-y-0.5 scale-110 bg-primary text-primary-foreground shadow-[0_0_14px] shadow-primary/60",
                  )}
                >
                  {taken ? <XIcon className="mt-0.5 size-3" /> : seat.number}
                </button>
              )

              // Aisle spacer goes between the two blocks.
              return c === leftColumns && rightColumns > 0
                ? [<span key={`aisle-${row}`} aria-hidden="true" />, seatButton]
                : seatButton
            })

            return [rowLabelCell("start"), ...seats.flat(), rowLabelCell("end")]
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5">
        {LEGEND.map(({ label, className }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-4 rounded-t-md rounded-b-[3px]", className)}
            />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
