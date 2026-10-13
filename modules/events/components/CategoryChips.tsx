import { cn } from "@/lib/utils"
import type { EventCategory } from "@/modules/events/types/event.types"
import { getCategoryIcon } from "@/modules/events/utils/category-icons"

interface CategoryChipsProps {
  categories: EventCategory[]
}

const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
}

export function CategoryChips({ categories }: CategoryChipsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.iconKey)

          return (
            <div
              key={category.id}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                CATEGORY_COLOR_CLASSES[category.colorKey] ?? "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{category.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
