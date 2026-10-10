const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Numeric parts + own month table: output does not depend on the runtime's ICU locale data.
const parts = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "America/Lima",
});

export function formatShortDate(date: Date) {
  const { day, month, year } = Object.fromEntries(
    parts.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${day.padStart(2, "0")} ${MONTHS[Number(month) - 1]} ${year}`;
}
