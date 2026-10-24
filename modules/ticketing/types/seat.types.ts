/** 1-based (row, number) position inside a numbered zone. */
export interface SeatRef {
  row: number
  number: number
}

/** Grid of a numbered zone. */
export interface SeatLayout {
  rows: number
  columns: number
}

/** Layout every zone gets; the single source of truth for seats per zone. */
export const DEFAULT_SEAT_LAYOUT: SeatLayout = { rows: 10, columns: 10 }

export const DEFAULT_SEAT_CAPACITY = DEFAULT_SEAT_LAYOUT.rows * DEFAULT_SEAT_LAYOUT.columns
