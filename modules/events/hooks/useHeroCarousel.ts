"use client"

import { useCallback, useEffect, useState } from "react"

interface UseHeroCarouselOptions {
  intervalMs: number
}

interface UseHeroCarouselResult {
  index: number
  isPaused: boolean
  next: () => void
  prev: () => void
  togglePause: () => void
}

export function useHeroCarousel(
  itemCount: number,
  { intervalMs }: UseHeroCarouselOptions
): UseHeroCarouselResult {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % itemCount)
  }, [itemCount])

  const prev = useCallback(() => {
    setIndex((current) => (current - 1 + itemCount) % itemCount)
  }, [itemCount])

  const togglePause = useCallback(() => {
    setIsPaused((current) => !current)
  }, [])

  useEffect(() => {
    if (isPaused || itemCount <= 1) {
      return
    }

    // One timeout per shown item (not an interval): next()/prev() restart the
    // countdown, so the progress bar and the autoplay never drift apart.
    const id = setTimeout(() => {
      setIndex((current) => (current + 1) % itemCount)
    }, intervalMs)

    return () => clearTimeout(id)
  }, [index, isPaused, itemCount, intervalMs])

  return { index, isPaused, next, prev, togglePause }
}
