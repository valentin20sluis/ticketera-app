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
