// Numeric parts only: output does not depend on the runtime's ICU locale data.
// hourCycle "h23" avoids "24:xx" at midnight.
const checkedInParts = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Lima",
});

/** ISO UTC -> "dd/MM/yyyy HH:mm" in America/Lima. */
export function formatCheckedInAt(iso: string): string {
  const { day, month, year, hour, minute } = Object.fromEntries(
    checkedInParts.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function summarizeTickets(tickets: { status: "valid" | "used" }[] | undefined): {
  total: number;
  used: number;
} {
  const list = tickets ?? [];
  return { total: list.length, used: list.filter((t) => t.status === "used").length };
}
