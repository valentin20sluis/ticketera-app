import { describe, expect, it } from "vitest";

import { formatCheckedInAt, summarizeTickets } from "./ticket-status";

describe("formatCheckedInAt", () => {
  it("formats a normal time in Lima (UTC-5)", () => {
    expect(formatCheckedInAt("2026-12-01T20:05:00.000Z")).toBe("01/12/2026 15:05");
  });

  it("shows Lima midnight as 00:00, not 24:00", () => {
    expect(formatCheckedInAt("2026-12-02T05:00:00.000Z")).toBe("02/12/2026 00:00");
  });

  it("crosses the day boundary in Lima, not UTC", () => {
    expect(formatCheckedInAt("2026-12-02T04:59:00.000Z")).toBe("01/12/2026 23:59");
  });

  it("uses Lima date when UTC is already the next year", () => {
    expect(formatCheckedInAt("2027-01-01T04:30:00.000Z")).toBe("31/12/2026 23:30");
  });

  it("zero-pads day, month and hour", () => {
    expect(formatCheckedInAt("2026-03-05T12:07:00.000Z")).toBe("05/03/2026 07:07");
  });
});

describe("summarizeTickets", () => {
  it("counts a mix of valid and used", () => {
    const tickets = [{ status: "used" }, { status: "valid" }, { status: "used" }] as const;
    expect(summarizeTickets([...tickets])).toEqual({ total: 3, used: 2 });
  });

  it("counts all used", () => {
    expect(summarizeTickets([{ status: "used" }, { status: "used" }])).toEqual({ total: 2, used: 2 });
  });

  it("counts none used", () => {
    expect(summarizeTickets([{ status: "valid" }])).toEqual({ total: 1, used: 0 });
  });

  it("returns zeros for undefined", () => {
    expect(summarizeTickets(undefined)).toEqual({ total: 0, used: 0 });
  });

  it("returns zeros for an empty list", () => {
    expect(summarizeTickets([])).toEqual({ total: 0, used: 0 });
  });
});
