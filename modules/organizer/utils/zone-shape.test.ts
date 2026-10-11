import { describe, expect, it } from "vitest";

import { buildStackedZoneShape } from "@/modules/organizer/utils/zone-shape";

function expectNoOverlap(total: number) {
  const shapes = Array.from({ length: total }, (_, index) => buildStackedZoneShape(index, total));

  for (let i = 0; i < shapes.length - 1; i += 1) {
    expect(shapes[i].y + shapes[i].height).toBeLessThanOrEqual(shapes[i + 1].y);
  }
}

describe("buildStackedZoneShape", () => {
  it("no genera superposición con total: 1", () => {
    expectNoOverlap(1);
  });

  it("no genera superposición con total: 3", () => {
    expectNoOverlap(3);
  });
});
