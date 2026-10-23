import { describe, expect, it } from "vitest";

import { getVenueMapLinks } from "./venue-map.service";

describe("getVenueMapLinks", () => {
  it("builds embed and directions urls", () => {
    expect(getVenueMapLinks(-12.0464, -77.0428)).toEqual({
      embedUrl: "https://www.google.com/maps?q=-12.0464,-77.0428&z=15&output=embed",
      directionsUrl:
        "https://www.google.com/maps/search/?api=1&query=-12.0464,-77.0428",
    });
  });

  it("accepts exact limits", () => {
    expect(getVenueMapLinks(90, 180)).not.toBeNull();
    expect(getVenueMapLinks(-90, -180)).not.toBeNull();
  });

  it.each([
    [undefined, 10],
    [10, undefined],
    [NaN, 10],
    [10, NaN],
    [Infinity, 10],
    [10, -Infinity],
    [91, 10],
    [-91, 10],
    [10, 181],
    [10, -181],
  ])("returns null for invalid (%s, %s)", (lat, lng) => {
    expect(getVenueMapLinks(lat, lng)).toBeNull();
  });
});
