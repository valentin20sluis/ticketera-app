"use client"

import { useState, useTransition } from "react"

import { Switch } from "@/components/ui/switch"
import { setEventFeaturedAction } from "@/modules/organizer/actions/event.actions"

interface FeaturedToggleProps {
  eventId: string
  title: string
  featured: boolean
}

// Rendered only for admins on published events (decided by the caller).
export function FeaturedToggle({ eventId, title, featured }: FeaturedToggleProps) {
  const [checked, setChecked] = useState(featured)
  const [error, setError] = useState<string>()
  const [saving, startSave] = useTransition()

  function toggle(next: boolean) {
    const previous = checked
    setError(undefined)
    setChecked(next)
    startSave(async () => {
      const state = await setEventFeaturedAction({ eventId, featured: next })
      if (state.error) {
        setChecked(previous)
        setError(state.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        onCheckedChange={toggle}
        disabled={saving}
        aria-label={`Destacar ${title}`}
      />
      <div aria-live="polite">{error && <p className="max-w-48 text-xs text-destructive">{error}</p>}</div>
    </div>
  )
}
