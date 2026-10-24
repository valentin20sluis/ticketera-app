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
import type { SeatRef } from "@/modules/ticketing/types/seat.types"

export interface TicketSelectionLine {
  zoneId: string
  zoneName: string
  price: number
  quantity: number
  subtotal: number
  seats?: SeatRef[]
}

export interface UseTicketSelectionResult {
  activeZoneId: string | null
  quantities: Record<string, number>
  seatsByZone: Record<string, SeatRef[]>
  lines: TicketSelectionLine[]
  totalQuantity: number
  totalAmount: number
  selectZone: (zoneId: string) => void
  clearActiveZone: () => void
  increment: (zoneId: string) => void
  decrement: (zoneId: string) => void
  toggleSeat: (zoneId: string, seat: SeatRef) => void
  getZoneStatus: (zoneId: string) => ZoneSelectionStatus
}

function buildInitialQuantities(zones: VenueZone[]): Record<string, number> {
  return Object.fromEntries(zones.map((zone) => [zone.id, 0]))
}

const sameSeat = (a: SeatRef, b: SeatRef) =>
  a.row === b.row && a.number === b.number

export function useTicketSelection(zones: VenueZone[]): UseTicketSelectionResult {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [standingQuantities, setQuantities] = useState<Record<string, number>>(
    () => buildInitialQuantities(zones),
  )
  const [pickedSeats, setPickedSeats] = useState<Record<string, SeatRef[]>>({})

  const zonesById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone])),
    [zones],
  )

  // Seats that became taken after a reload are dropped; the rest are kept.
  const seatsByZone = useMemo(
    () =>
      Object.fromEntries(
        zones
          .filter((zone) => zone.seatLayout)
          .map((zone) => [
            zone.id,
            (pickedSeats[zone.id] ?? []).filter(
              (seat) => !zone.takenSeats?.some((taken) => sameSeat(taken, seat)),
            ),
          ]),
      ) as Record<string, SeatRef[]>,
    [zones, pickedSeats],
  )

  const quantities = useMemo(
    () => ({
      ...standingQuantities,
      ...Object.fromEntries(
        Object.entries(seatsByZone).map(([id, seats]) => [id, seats.length]),
      ),
    }),
    [standingQuantities, seatsByZone],
  )

  const selectZone = useCallback(
    (zoneId: string) => {
      const zone = zonesById.get(zoneId)
      if (!zone || isZoneSoldOut(zone)) return

      setActiveZoneId(zoneId)
      if (zone.seatLayout || (quantities[zoneId] ?? 0) > 0) return
      setQuantities((current) => ({ ...current, [zoneId]: 1 }))
    },
    [zonesById, quantities],
  )

  const clearActiveZone = useCallback(() => setActiveZoneId(null), [])

  const increment = useCallback(
    (zoneId: string) => {
      const zone = zonesById.get(zoneId)
      if (!zone || zone.seatLayout) return

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
      if (!zone || zone.seatLayout) return

      const quantity = quantities[zoneId] ?? 0
      if (quantity <= 0) return

      setActiveZoneId(zoneId)
      setQuantities((current) => ({ ...current, [zoneId]: quantity - 1 }))
    },
    [zonesById, quantities],
  )

  const toggleSeat = useCallback(
    (zoneId: string, seat: SeatRef) => {
      const zone = zonesById.get(zoneId)
      if (!zone?.seatLayout) return
      if (zone.takenSeats?.some((taken) => sameSeat(taken, seat))) return

      const current = seatsByZone[zoneId] ?? []
      const isPicked = current.some((picked) => sameSeat(picked, seat))
      if (!isPicked && current.length >= getZoneMaxQuantity(zone)) return

      setActiveZoneId(zoneId)
      setPickedSeats((all) => ({
        ...all,
        [zoneId]: isPicked
          ? current.filter((picked) => !sameSeat(picked, seat))
          : [...current, seat],
      }))
    },
    [zonesById, seatsByZone],
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
            ...(zone.seatLayout && { seats: seatsByZone[zone.id] }),
          }
        }),
    [zones, quantities, seatsByZone],
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
    seatsByZone,
    lines,
    totalQuantity,
    totalAmount,
    selectZone,
    clearActiveZone,
    increment,
    decrement,
    toggleSeat,
    getZoneStatus,
  }
}
