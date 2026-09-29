import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useHeroCarousel } from "./useHeroCarousel"

describe("useHeroCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("auto-advances the index every intervalMs while not paused", () => {
    const { result } = renderHook(() => useHeroCarousel(3, { intervalMs: 1000 }))

    expect(result.current.index).toBe(0)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.index).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.index).toBe(2)
  })

  it("wraps around from the last index to 0 on auto-advance", () => {
    const { result } = renderHook(() => useHeroCarousel(2, { intervalMs: 1000 }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.index).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.index).toBe(0)
  })

  it("next() wraps around from the last index to 0", () => {
    const { result } = renderHook(() => useHeroCarousel(3, { intervalMs: 1000 }))

    act(() => {
      result.current.next()
      result.current.next()
      result.current.next()
    })

    expect(result.current.index).toBe(0)
  })

  it("prev() wraps around from 0 to the last index", () => {
    const { result } = renderHook(() => useHeroCarousel(3, { intervalMs: 1000 }))

    act(() => {
      result.current.prev()
    })

    expect(result.current.index).toBe(2)
  })

  it("togglePause() stops and resumes the auto-advance", () => {
    const { result } = renderHook(() => useHeroCarousel(3, { intervalMs: 1000 }))

    act(() => {
      result.current.togglePause()
    })
    expect(result.current.isPaused).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.index).toBe(0)

    act(() => {
      result.current.togglePause()
    })
    expect(result.current.isPaused).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.index).toBe(1)
  })
})
