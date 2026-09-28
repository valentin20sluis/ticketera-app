"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HeartbeatOnViewProps {
  children: ReactNode;
}

/**
 * Plays a 4 s heartbeat on its children each time they scroll into view.
 * The observed element is not the animated one, so the scale does not
 * change the intersection ratio and retrigger the animation.
 */
export function HeartbeatOnView({ children }: HeartbeatOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full">
      <div
        className={cn(
          "h-full",
          inView && "animate-heartbeat motion-reduce:animate-none",
        )}
      >
        {children}
      </div>
    </div>
  );
}
