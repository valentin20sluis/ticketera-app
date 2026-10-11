"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface SelectFieldOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id?: string
  "aria-label"?: string
  options: readonly SelectFieldOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

// shadcn Select at the shared control height (h-10).
export function SelectField({ id, options, value, onValueChange, placeholder, className, ...rest }: SelectFieldProps) {
  return (
    <Select items={options} value={value || null} onValueChange={(next) => onValueChange(next ?? "")}>
      <SelectTrigger id={id} aria-label={rest["aria-label"]} className={cn("h-10 w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
