import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatEventTime, formatFullEventDate } from "@/modules/events/utils/format-event-date"

interface FunctionPickerProps {
  slug: string
  functions: { id: string; startsAt: string }[]
  selectedId: string
}

export function FunctionPicker({ slug, functions, selectedId }: FunctionPickerProps) {
  return (
    <nav aria-label="Elegir función" className="flex flex-wrap gap-2">
      {functions.map((fn) => (
        <Link
          key={fn.id}
          href={`/eventos/${slug}/entradas?funcion=${fn.id}`}
          aria-current={fn.id === selectedId ? "true" : undefined}
          className={cn(buttonVariants({ variant: fn.id === selectedId ? "default" : "outline" }))}
        >
          {formatFullEventDate(fn.startsAt)} · {formatEventTime(fn.startsAt)}
        </Link>
      ))}
    </nav>
  )
}
