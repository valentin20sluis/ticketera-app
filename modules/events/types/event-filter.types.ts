export type SortOption = "date" | "price";

export interface PriceRangeOption {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

export interface MonthOption {
  value: string;
  label: string;
}

export interface EventFilters {
  query: string;
  categoryIds: string[];
  cities: string[];
  month: string;
  priceRangeId: string;
  sortBy: SortOption;
}
