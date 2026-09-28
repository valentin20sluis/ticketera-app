const TIME_ZONE = "America/Lima";

const wholePriceFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalPriceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatPrice(amount: number): string {
  const formatter = Number.isInteger(amount)
    ? wholePriceFormatter
    : decimalPriceFormatter;
  return `S/ ${formatter.format(amount)}`;
}

export function formatDateTime(iso: string): string {
  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value.replace(/\.$/, "")]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.hour}:${parts.minute}`;
}
