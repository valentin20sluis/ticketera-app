"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { es } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  id?: string
  // "YYYY-MM-DD" or "" when empty.
  value: string
  onChange: (value: string) => void
  placeholder?: string
  "aria-label"?: string
  min?: string
  max?: string
  className?: string
}

// Parsed at local noon so the calendar day never shifts with the timezone.
const toDate = (value: string) => (value ? new Date(`${value}T12:00:00`) : undefined)

const toValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function DatePicker({ id, value, onChange, placeholder = "Elegir fecha", min, max, className, ...rest }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = toDate(value)
  const minDate = toDate(min ?? "")
  const maxDate = toDate(max ?? "")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={rest["aria-label"]}
            className={cn("h-10 w-full justify-start gap-2 px-2.5 font-normal", !selected && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarIcon aria-hidden="true" />
        {selected ? selected.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          onSelect={(date) => {
            onChange(date ? toValue(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
