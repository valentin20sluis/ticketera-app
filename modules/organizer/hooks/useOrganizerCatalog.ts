"use client";

import { useCallback, useEffect, useState } from "react";

import type { OrganizerCatalog } from "@/modules/organizer/types/organizer.types";
import {
  appendOrganizerEvent,
  mergeCatalogs,
  readStoredCatalog,
  type AppendOrganizerEventInput,
} from "@/modules/organizer/utils/organizer-catalog-storage";

export interface UseOrganizerCatalogResult {
  catalog: OrganizerCatalog;
  addEvent: (entry: AppendOrganizerEventInput) => void;
}

/**
 * Starts from `seedCatalog` (no `localStorage` read during the initial
 * render) so the first client render matches the server render; hydrates
 * from `localStorage` once mounted, then keeps `catalog` in sync whenever a
 * new event is persisted.
 */
export function useOrganizerCatalog(
  seedCatalog: OrganizerCatalog
): UseOrganizerCatalogResult {
  const [catalog, setCatalog] = useState<OrganizerCatalog>(seedCatalog);

  useEffect(() => {
    const storedCatalog = readStoredCatalog();
    if (storedCatalog.venues.length > 0 || storedCatalog.events.length > 0) {
      // Intentional: synchronizing React state from `localStorage` (an
      // external system React cannot read during render/SSR) is exactly
      // the one-time hydration this hook exists for — never a subscription
      // loop, since the effect itself never re-runs (empty deps below).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCatalog(mergeCatalogs(seedCatalog, storedCatalog));
    }
    // Runs once on mount only: `localStorage` hydration must never re-run
    // on later re-renders, regardless of whether `seedCatalog` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addEvent = useCallback(
    (entry: AppendOrganizerEventInput) => {
      const updatedCatalog = appendOrganizerEvent(entry);
      setCatalog(mergeCatalogs(seedCatalog, updatedCatalog));
    },
    [seedCatalog]
  );

  return { catalog, addEvent };
}
