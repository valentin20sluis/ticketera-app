import { describe, expect, it } from "vitest"
import { formatLimaDateTime, parseLimaDateTime } from "./lima-time"

describe("lima time", () => {
  it("reads datetime-local as UTC-5 and round-trips", () => {
    const date = parseLimaDateTime("2030-05-10T19:00")
    expect(date?.toISOString()).toBe("2030-05-11T00:00:00.000Z")
    expect(formatLimaDateTime(date!)).toBe("2030-05-10T19:00")
  })

  it("rejects malformed values", () => {
    expect(parseLimaDateTime("")).toBeNull()
    expect(parseLimaDateTime("2030-13-45T99:00")).toBeNull()
    expect(parseLimaDateTime("2030-05-10")).toBeNull()
  })
})
