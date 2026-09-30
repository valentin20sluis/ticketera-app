import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

interface EventSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function EventSearchBar({ value, onChange }: EventSearchBarProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por artista, evento o ciudad"
        aria-label="Buscar eventos"
        className="h-10 pl-8"
      />
    </div>
  )
}
