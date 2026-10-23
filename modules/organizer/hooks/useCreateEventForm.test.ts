import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCreateEventForm } from "./useCreateEventForm";

const blankZone = { name: "", capacity: 0, price: 0 };

function fillValidDetails(result: { current: ReturnType<typeof useCreateEventForm> }, imageUrl: string) {
  result.current.updateDetailsField("title", "Concierto de rock");
  result.current.updateDetailsField("description", "Una gran noche de rock en vivo");
  result.current.updateDetailsField("categoryId", "music");
  result.current.updateDetailsField("imageUrl", imageUrl);
  result.current.updateDetailsField("doorsOpenTime", "19:00");
  result.current.updateDetailsField("showStartTime", "20:00");
  result.current.updateDetailsField("minimumAge", "18");
  result.current.updateDetailsField("admissionType", "General");
}

describe("useCreateEventForm", () => {
  it("returns the expected initial state", () => {
    const { result } = renderHook(() => useCreateEventForm());

    expect(result.current.step).toBe("details");
    expect(result.current.values.details).toEqual({
      title: "",
      description: "",
      categoryId: "",
      imageUrl: "",
      doorsOpenTime: "",
      showStartTime: "",
      minimumAge: "",
      admissionType: "",
    });
    expect(result.current.values.venue).toEqual({ mode: "existing", venueId: "" });
    expect(result.current.values.functions).toEqual([{ startsAt: "", zones: [blankZone] }]);
    expect(result.current.errors).toEqual({});
  });

  it("updateDetailsField isolates the targeted field", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.updateDetailsField("title", "Concierto de rock");
    });

    expect(result.current.values.details).toEqual({
      title: "Concierto de rock",
      description: "",
      categoryId: "",
      imageUrl: "",
      doorsOpenTime: "",
      showStartTime: "",
      minimumAge: "",
      admissionType: "",
    });
  });

  it("addZoneRow appends an empty row only to the targeted function", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addFunction();
      result.current.addZoneRow(1);
    });

    expect(result.current.values.functions[0].zones).toEqual([blankZone]);
    expect(result.current.values.functions[1].zones).toEqual([blankZone, blankZone]);
  });

  it("updateZoneRow updates only the targeted field of the targeted row", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addFunction();
      result.current.addZoneRow(1);
      result.current.updateZoneRow(1, 1, "name", "VIP");
      result.current.updateZoneRow(1, 1, "capacity", "50");
      result.current.updateZoneRow(1, 1, "price", "99.5");
    });

    expect(result.current.values.functions[1].zones).toEqual([
      blankZone,
      { name: "VIP", capacity: 50, price: 99.5 },
    ]);
    expect(result.current.values.functions[0].zones).toEqual([blankZone]);
  });

  it("removeZoneRow removes the row at the given index when there is more than one", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addZoneRow(0);
      result.current.updateZoneRow(0, 0, "name", "General");
      result.current.updateZoneRow(0, 1, "name", "VIP");
    });

    act(() => {
      result.current.removeZoneRow(0, 0);
    });

    expect(result.current.values.functions[0].zones).toEqual([
      { name: "VIP", capacity: 0, price: 0 },
    ]);
  });

  it("removeZoneRow is a no-op when only one row remains", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.removeZoneRow(0, 0);
    });

    expect(result.current.values.functions[0].zones).toEqual([blankZone]);
  });

  it("addFunction appends a blank function and removeFunction never leaves fewer than one", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addFunction();
      result.current.updateFunctionStartsAt(0, "2099-01-01T20:00");
      result.current.updateFunctionStartsAt(1, "2099-01-02T20:00");
    });

    expect(result.current.values.functions.map((fn) => fn.startsAt)).toEqual([
      "2099-01-01T20:00",
      "2099-01-02T20:00",
    ]);

    act(() => {
      result.current.removeFunction(0);
    });
    expect(result.current.values.functions.map((fn) => fn.startsAt)).toEqual(["2099-01-02T20:00"]);

    act(() => {
      result.current.removeFunction(0);
    });
    expect(result.current.values.functions).toHaveLength(1);
  });

  it("validateStep('details') returns true with valid data", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      fillValidDetails(result, "https://example.com/image.jpg");
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validateStep("details");
    });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("validateStep('details') returns false and reports errors.imageUrl when imageUrl is invalid", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      fillValidDetails(result, "not-a-url");
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validateStep("details");
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.imageUrl).toBeDefined();
  });

  it("validateStep('zones') reports errors with the function index in the path", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addFunction();
      result.current.updateFunctionStartsAt(0, "2026-01-01T20:00");
      result.current.updateFunctionStartsAt(1, "2026-01-01T20:00");
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validateStep("zones");
    });

    expect(isValid).toBe(false);
    expect(result.current.errors["functions.0.zones.0.capacity"]).toBeDefined();
    expect(result.current.errors["functions.1.startsAt"]).toBeDefined();
  });
});

describe("useCreateEventForm with initial values", () => {
  it("starts from the given values (N functions) instead of the blank form", () => {
    const initial = {
      details: {
        title: "Rock",
        description: "Una descripción larga",
        categoryId: "cat",
        imageUrl: "https://example.com/a.jpg",
        doorsOpenTime: "19:00",
        showStartTime: "20:00",
        minimumAge: "18+",
        admissionType: "General",
      },
      venue: { mode: "existing" as const, venueId: "v1" },
      functions: [
        { startsAt: "2099-01-01T20:00", zones: [{ name: "VIP", capacity: 5, price: 10 }] },
        { startsAt: "2099-01-02T20:00", zones: [{ name: "General", capacity: 50, price: 5 }] },
      ],
    };
    const { result } = renderHook(() => useCreateEventForm(initial));

    expect(result.current.values).toEqual(initial);
  });
});
