export class InvalidPlatformFeeError extends Error {
  constructor(message = "PLATFORM_FEE_PERCENT must be a number between 0 and 100") {
    super(message);
    this.name = "InvalidPlatformFeeError";
  }
}

function assertValidPercent(percent: number): void {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new InvalidPlatformFeeError();
  }
}

/** Parses the PLATFORM_FEE_PERCENT env value. Fails safe: never defaults to 0. */
export function parsePlatformFeePercent(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") throw new InvalidPlatformFeeError();
  const percent = Number(raw);
  assertValidPercent(percent);
  return percent;
}

/**
 * Platform fee in minor units: round half-up of total * percent / 100.
 * The percent is converted to basis points so the math stays in integers.
 */
export function calculatePlatformFee(totalMinor: number, percent: number): number {
  assertValidPercent(percent);
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) {
    throw new RangeError("totalMinor must be a non-negative integer");
  }
  const basisPoints = Math.round(percent * 100);
  const fee = Math.floor((totalMinor * basisPoints + 5000) / 10000);
  return Math.min(fee, totalMinor);
}
