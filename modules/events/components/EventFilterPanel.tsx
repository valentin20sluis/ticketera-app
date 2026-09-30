import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { EventCategory } from "@/modules/events/types/event.types"
import type {
  MonthOption,
  PriceRangeOption,
} from "@/modules/events/types/event-filter.types"

const ANY_MONTH_VALUE = "all"

interface EventFilterPanelProps {
  categories: Pick<EventCategory, "id" | "name">[]
  categoryCounts: Record<string, number>
  selectedCategoryIds: string[]
  onToggleCategory: (categoryId: string) => void
  cities: string[]
  selectedCities: string[]
  onToggleCity: (city: string) => void
  months: MonthOption[]
  selectedMonth: string
  onMonthChange: (month: string) => void
  priceRanges: PriceRangeOption[]
  selectedPriceRangeId: string
  onPriceRangeChange: (priceRangeId: string) => void
  onReset: () => void
}

function FilterSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

export function EventFilterPanel({
  categories,
  categoryCounts,
  selectedCategoryIds,
  onToggleCategory,
  cities,
  selectedCities,
  onToggleCity,
  months,
  selectedMonth,
  onMonthChange,
  priceRanges,
  selectedPriceRangeId,
  onPriceRangeChange,
  onReset,
}: EventFilterPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Filtros</h2>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Limpiar filtros
        </Button>
      </div>

      <FilterSection title="Categoría">
        <div className="flex flex-col gap-2.5">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategoryIds.includes(category.id)}
                onCheckedChange={() => onToggleCategory(category.id)}
              />
              <label
                htmlFor={`category-${category.id}`}
                className="text-sm text-foreground"
              >
                {category.name} ({categoryCounts[category.id] ?? 0})
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Ciudad">
        <div className="flex flex-col gap-2.5">
          {cities.map((city) => (
            <div key={city} className="flex items-center gap-2">
              <Checkbox
                id={`city-${city}`}
                checked={selectedCities.includes(city)}
                onCheckedChange={() => onToggleCity(city)}
              />
              <label htmlFor={`city-${city}`} className="text-sm text-foreground">
                {city}
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Fecha">
        <RadioGroup
          value={selectedMonth}
          onValueChange={(value) => onMonthChange(String(value))}
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="month-all" value={ANY_MONTH_VALUE} />
            <label htmlFor="month-all" className="text-sm text-foreground">
              Cualquier fecha
            </label>
          </div>
          {months.map((month) => (
            <div key={month.value} className="flex items-center gap-2">
              <RadioGroupItem id={`month-${month.value}`} value={month.value} />
              <label
                htmlFor={`month-${month.value}`}
                className="text-sm text-foreground"
              >
                {month.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </FilterSection>

      <FilterSection title="Precio">
        <RadioGroup
          value={selectedPriceRangeId}
          onValueChange={(value) => onPriceRangeChange(String(value))}
          className="flex flex-col gap-2.5"
        >
          {priceRanges.map((priceRange) => (
            <div key={priceRange.id} className="flex items-center gap-2">
              <RadioGroupItem id={`price-${priceRange.id}`} value={priceRange.id} />
              <label
                htmlFor={`price-${priceRange.id}`}
                className="text-sm text-foreground"
              >
                {priceRange.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </FilterSection>
    </div>
  )
}
