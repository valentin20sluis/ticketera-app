"use client"

import { useCallback, useMemo, useState } from "react"

import {
  getZoneMaxQuantity,
  isZoneSoldOut,
} from "@/modules/events/services/venue-zone.service"
import type {
  VenueZone,
  ZoneSelectionStatus,
} from "@/modules/events/types/venue-zone.types"

export interface TicketSelectionLine {
  zoneId: string
  zoneName: string
  price: number
  quantity: number
  subtotal: number
}

interface UseTicketSelectionResult {
  activeZoneId: string | null
  quantities: Record<string, number>
  lines: TicketSelectionLine[]
  totalQuantity: number
  totalAmount: number
  selectZone: (zoneId: string) => void
  increment: (zoneId: string) => void
  decrement: (zoneId: string) => void
  getZoneStatus: (zoneId: string) => ZoneSelectionStatus
}

function buildInitialQuantities(zones: VenueZone[]): Record<string, number> {
  return Object.fromEntries(zones.map((zone) => [zone.id, 0]))
}

export function useTicketSelection(zones: VenueZone[]): UseTicketSelectionResult {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    buildInitialQuantities(zones),
  )

  const zonesById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone])),
    [zones],
  )

  const selectZone = useCallback(
    (zoneId: string) => {
      const zone = zonesById.get(zoneId)
      if (!zone || isZoneSoldOut(zone)) return

      setActiveZoneId(zoneId)
      if ((quantities[zoneId] ?? 0) > 0) return
      setQuantities((current) => ({ ...current, [zoneId]: 1 }))
    },
    [zonesById, quantities],
  )

  const increment = useCallback(
    (zoneId: string) => {
      const zone = zonesById.get(zoneId)
      if (!zone) return

      const quantity = quantities[zoneId] ?? 0
      const maxQuantity = getZoneMaxQuantity(zone)
      if (quantity >= maxQuantity) return

      setActiveZoneId(zoneId)
      setQuantities((current) => ({ ...current, [zoneId]: quantity + 1 }))
    },
    [zonesById, quantities],
  )

  const decrement = useCallback(
    (zoneId: string) => {
      const zone = zonesById.get(zoneId)
      if (!zone) return

      const quantity = quantities[zoneId] ?? 0
      if (quantity <= 0) return

      setActiveZoneId(zoneId)
      setQuantities((current) => ({ ...current, [zoneId]: quantity - 1 }))
    },
    [zonesById, quantities],
  )

  const getZoneStatus = useCallback(
    (zoneId: string): ZoneSelectionStatus => {
      const zone = zonesById.get(zoneId)
      if (zone && isZoneSoldOut(zone)) return "sold-out"
      if ((quantities[zoneId] ?? 0) > 0) return "selected"
      return "available"
    },
    [zonesById, quantities],
  )

  const lines = useMemo<TicketSelectionLine[]>(
    () =>
      zones
        .filter((zone) => (quantities[zone.id] ?? 0) > 0)
        .map((zone) => {
          const quantity = quantities[zone.id] ?? 0
          return {
            zoneId: zone.id,
            zoneName: zone.name,
            price: zone.price,
            quantity,
            subtotal: zone.price * quantity,
          }
        }),
    [zones, quantities],
  )

  const totalQuantity = useMemo(
    () => Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0),
    [quantities],
  )

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + line.subtotal, 0),
    [lines],
  )

  return {
    activeZoneId,
    quantities,
    lines,
    totalQuantity,
    totalAmount,
    selectZone,
    increment,
    decrement,
    getZoneStatus,
  }
}
