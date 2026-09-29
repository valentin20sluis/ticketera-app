const MONTH_ABBREVIATIONS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
] as const

export function formatEventDateBadge(isoDate: string): { month: string; day: string } {
  const [datePart] = isoDate.split("T")
  const [, month, day] = datePart.split("-")

  return {
    month: MONTH_ABBREVIATIONS[Number(month) - 1],
    day: day.padStart(2, "0"),
  }
}
