import type { SeatRef } from "@/modules/ticketing/types/seat.types"

const LETTERS = 26

/** 1 -> "A", 26 -> "Z", 27 -> "AA". */
function rowLetters(row: number): string {
  let label = ""
  for (let n = row; n > 0; n = Math.floor((n - 1) / LETTERS)) {
    label = String.fromCharCode(65 + ((n - 1) % LETTERS)) + label
  }
  return label
}

export function seatLabel(seat: SeatRef): string {
  return `${rowLetters(seat.row)}${seat.number}`
}

export function formatSeat(seat: SeatRef): string {
  return `Fila ${rowLetters(seat.row)} · Asiento ${seat.number}`
}
