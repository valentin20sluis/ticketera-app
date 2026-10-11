import { describe, expect, it } from "vitest"
import { buildUniqueSlug, slugify } from "./event-slug"

describe("event slug", () => {
  it("strips accents and symbols", () => {
    expect(slugify("  ¡Música en Vivo! ")).toBe("musica-en-vivo")
  })

  it("adds a random suffix and falls back to 'evento'", () => {
    expect(buildUniqueSlug("Rock")).toMatch(/^rock-[0-9a-f]{8}$/)
    expect(buildUniqueSlug("???")).toMatch(/^evento-[0-9a-f]{8}$/)
    expect(buildUniqueSlug("Rock")).not.toBe(buildUniqueSlug("Rock"))
  })
})
