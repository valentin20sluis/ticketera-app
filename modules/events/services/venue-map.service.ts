export type VenueMapLinks = { embedUrl: string; directionsUrl: string };

const inRange = (v: number | undefined, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max;

export function getVenueMapLinks(
  lat: number | undefined,
  lng: number | undefined,
): VenueMapLinks | null {
  if (!inRange(lat, 90) || !inRange(lng, 180)) return null;
  return {
    embedUrl: `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`,
    directionsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}
