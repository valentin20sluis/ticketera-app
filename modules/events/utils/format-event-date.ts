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

export function formatFullEventDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatEventTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  })
}
