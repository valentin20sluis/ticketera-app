import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type ChangeListener = () => void;

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const state = { matches: initialMatches };
  const addEventListener = vi.fn((_: string, listener: ChangeListener) => {
    listeners.add(listener);
  });
  const removeEventListener = vi.fn((_: string, listener: ChangeListener) => {
    listeners.delete(listener);
  });
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return state.matches;
    },
    media: query,
    addEventListener,
    removeEventListener,
  }));

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    addEventListener,
    removeEventListener,
    listeners,
    setMatches(value: boolean) {
      state.matches = value;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("usePrefersReducedMotion", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when the user prefers reduced motion", () => {
    const media = mockMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });

  it("returns false when the user does not prefer reduced motion", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);

    act(() => media.setMatches(false));
    expect(result.current).toBe(false);
  });

  it("removes the change listener on unmount", () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());

    expect(media.listeners.size).toBe(1);

    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(media.listeners.size).toBe(0);
  });
});
