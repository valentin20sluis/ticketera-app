import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  onDecode: null as null | ((r: { data: string }) => void),
  start: vi.fn(),
  destroy: vi.fn(),
  options: null as unknown,
}));

vi.mock("qr-scanner", () => ({
  default: class {
    constructor(_v: unknown, onDecode: (r: { data: string }) => void, options: unknown) {
      h.onDecode = onDecode;
      h.options = options;
    }
    start = h.start;
    destroy = h.destroy;
  },
}));

import { SCAN_COOLDOWN_MS, useQrScanner } from "./useQrScanner";

function setup(props: { onScan?: (c: string) => void; busy?: boolean } = {}) {
  const onScan = props.onScan ?? vi.fn();
  const hook = renderHook((p: { busy?: boolean }) => useQrScanner({ onScan, busy: p.busy }), {
    initialProps: { busy: props.busy },
  });
  // attach a video element so start() can build the scanner
  (hook.result.current.videoRef as { current: HTMLVideoElement | null }).current = document.createElement("video");
  return { ...hook, onScan };
}

describe("useQrScanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    h.start.mockReset().mockResolvedValue(undefined);
    h.destroy.mockReset();
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: vi.fn() }, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it("starts with the rear camera preferred and becomes active", async () => {
    const { result } = setup();
    await act(() => result.current.start());
    expect(result.current.status).toBe("active");
    expect(h.options).toMatchObject({ preferredCamera: "environment" });
  });

  it("emits a code once and ignores it for the cooldown, then emits again", async () => {
    const { result, onScan } = setup();
    await act(() => result.current.start());
    h.onDecode!({ data: "a" });
    h.onDecode!({ data: "a" });
    expect(onScan).toHaveBeenCalledTimes(1);
    h.onDecode!({ data: "b" });
    expect(onScan).toHaveBeenCalledTimes(2);
    vi.setSystemTime(SCAN_COOLDOWN_MS + 1);
    h.onDecode!({ data: "b" });
    expect(onScan).toHaveBeenCalledTimes(3);
  });

  it("does not emit while busy", async () => {
    const { result, rerender, onScan } = setup({ busy: true });
    await act(() => result.current.start());
    h.onDecode!({ data: "a" });
    expect(onScan).not.toHaveBeenCalled();
    rerender({ busy: false });
    h.onDecode!({ data: "a" });
    expect(onScan).toHaveBeenCalledWith("a");
  });

  it.each([
    [Object.assign(new Error("x"), { name: "NotAllowedError" }), "denied"],
    [Object.assign(new Error("x"), { name: "NotFoundError" }), "no-camera"],
    ["Camera not found.", "no-camera"],
    [new Error("boom"), "unknown"],
  ])("maps start failure %# to %s", async (failure, expected) => {
    h.start.mockRejectedValue(failure);
    const { result } = setup();
    await act(() => result.current.start());
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(expected);
    expect(result.current.errorMessage).toBeTruthy();
    expect(h.destroy).toHaveBeenCalled();
  });

  it("reports an insecure context without touching the camera", async () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    const { result } = setup();
    await act(() => result.current.start());
    expect(result.current.error).toBe("insecure");
    expect(h.start).not.toHaveBeenCalled();
  });

  it("destroys the scanner on stop and on unmount", async () => {
    const first = setup();
    await act(() => first.result.current.start());
    act(() => first.result.current.stop());
    expect(h.destroy).toHaveBeenCalledTimes(1);
    expect(first.result.current.status).toBe("idle");

    const second = setup();
    await act(() => second.result.current.start());
    second.unmount();
    expect(h.destroy).toHaveBeenCalledTimes(2);
  });
});
