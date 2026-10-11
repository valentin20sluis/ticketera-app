// Peru has no DST, so Lima is a fixed UTC-5.
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// "YYYY-MM-DDTHH:mm" (datetime-local) read as Lima time; null if malformed.
export function parseLimaDateTime(value: string): Date | null {
  if (!LOCAL_DATETIME.test(value)) return null;
  const date = new Date(`${value}:00-05:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLimaDateTime(date: Date): string {
  return new Date(date.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 16);
}
