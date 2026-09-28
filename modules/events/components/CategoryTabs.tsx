"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EVENT_CATEGORIES,
  type EventCategoryFilter,
} from "@/modules/events/types/event.types";

const TAB_OPTIONS = [
  { value: "all", label: "Todos" },
  ...EVENT_CATEGORIES,
] as const;

interface CategoryTabsProps {
  value: EventCategoryFilter;
  onValueChange: (value: EventCategoryFilter) => void;
}

export function CategoryTabs({ value, onValueChange }: CategoryTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as EventCategoryFilter)}
    >
      <div className="overflow-x-auto py-1">
        <TabsList
          aria-label="Filtrar por categoría"
          className="w-max group-data-horizontal/tabs:h-auto"
        >
          {TAB_OPTIONS.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="h-11 flex-none px-4 text-muted-foreground motion-reduce:transition-none"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
