import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCreateEventForm } from "./useCreateEventForm";

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
    expect(result.current.values.functionZones).toEqual({
      startsAt: "",
      zones: [{ name: "", capacity: 0, price: 0 }],
    });
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

  it("addZoneRow appends an empty row at the end of zones", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addZoneRow();
    });

    expect(result.current.values.functionZones.zones).toEqual([
      { name: "", capacity: 0, price: 0 },
      { name: "", capacity: 0, price: 0 },
    ]);
  });

  it("updateZoneRow updates only the targeted field of the targeted row", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addZoneRow();
      result.current.updateZoneRow(1, "name", "VIP");
      result.current.updateZoneRow(1, "capacity", "50");
      result.current.updateZoneRow(1, "price", "99.5");
    });

    expect(result.current.values.functionZones.zones).toEqual([
      { name: "", capacity: 0, price: 0 },
      { name: "VIP", capacity: 50, price: 99.5 },
    ]);
  });

  it("removeZoneRow removes the row at the given index when there is more than one", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.addZoneRow();
      result.current.updateZoneRow(0, "name", "General");
      result.current.updateZoneRow(1, "name", "VIP");
    });

    act(() => {
      result.current.removeZoneRow(0);
    });

    expect(result.current.values.functionZones.zones).toEqual([
      { name: "VIP", capacity: 0, price: 0 },
    ]);
  });

  it("removeZoneRow is a no-op when only one row remains", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.removeZoneRow(0);
    });

    expect(result.current.values.functionZones.zones).toEqual([
      { name: "", capacity: 0, price: 0 },
    ]);
  });

  it("validateStep('details') returns true with valid data", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.updateDetailsField("title", "Concierto de rock");
      result.current.updateDetailsField("description", "Una gran noche de rock en vivo");
      result.current.updateDetailsField("categoryId", "music");
      result.current.updateDetailsField("imageUrl", "https://example.com/image.jpg");
      result.current.updateDetailsField("doorsOpenTime", "19:00");
      result.current.updateDetailsField("showStartTime", "20:00");
      result.current.updateDetailsField("minimumAge", "18");
      result.current.updateDetailsField("admissionType", "General");
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
      result.current.updateDetailsField("title", "Concierto de rock");
      result.current.updateDetailsField("description", "Una gran noche de rock en vivo");
      result.current.updateDetailsField("categoryId", "music");
      result.current.updateDetailsField("imageUrl", "not-a-url");
      result.current.updateDetailsField("doorsOpenTime", "19:00");
      result.current.updateDetailsField("showStartTime", "20:00");
      result.current.updateDetailsField("minimumAge", "18");
      result.current.updateDetailsField("admissionType", "General");
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validateStep("details");
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.imageUrl).toBeDefined();
  });

  it("validateStep('zones') returns false and reports errors.zones when zones is empty", () => {
    const { result } = renderHook(() => useCreateEventForm());

    act(() => {
      result.current.updateFunctionStartsAt("2026-01-01T20:00");
      result.current.removeZoneRow(0);
    });

    expect(result.current.values.functionZones.zones).toHaveLength(1);

    let isValid = true;
    act(() => {
      isValid = result.current.validateStep("zones");
    });

    expect(isValid).toBe(false);
    expect(result.current.errors["zones.0.capacity"]).toBeDefined();
  });
});
