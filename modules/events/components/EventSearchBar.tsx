"use client";

import { Search } from "lucide-react";
import { useId, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_CITIES = "all";
const ANY_PRICE = "any";

const PRICE_ITEMS = [
  { value: ANY_PRICE, label: "Cualquier precio" },
  { value: "0-50", label: "Hasta S/ 50" },
  { value: "50-100", label: "S/ 50 a S/ 100" },
  { value: "100-", label: "Más de S/ 100" },
];

interface EventSearchBarProps {
  cities: string[];
}

interface SelectFieldProps {
  id: string;
  name: string;
  label: string;
  items: { value: string; label: string }[];
  defaultValue: string;
}

const LABEL_CLASSES = "text-sm font-medium text-foreground";

function SelectField({ id, name, label, items, defaultValue }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASSES}>
        {label}
      </label>
      <Select id={id} name={name} items={items} defaultValue={defaultValue}>
        <SelectTrigger className="h-11 w-full text-base data-[size=default]:h-11 md:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className="min-h-11">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EventSearchBar({ cities }: EventSearchBarProps) {
  const id = useId();
  const textId = `${id}-text`;
  const cityId = `${id}-city`;
  const dateId = `${id}-date`;
  const priceId = `${id}-price`;
  const cityItems = [
    { value: ALL_CITIES, label: "Todas las ciudades" },
    ...cities.map((city) => ({ value: city, label: city })),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form
      role="search"
      aria-label="Buscar eventos"
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end md:p-6"
    >
      <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
        <label htmlFor={textId} className={LABEL_CLASSES}>
          Evento o artista
        </label>
        <Input
          id={textId}
          type="search"
          name="query"
          placeholder="Busca un evento o artista"
          className="h-11"
        />
      </div>
      <SelectField
        id={cityId}
        name="city"
        label="Ciudad"
        items={cityItems}
        defaultValue={ALL_CITIES}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={dateId} className={LABEL_CLASSES}>
          Fecha
        </label>
        <Input id={dateId} type="date" name="date" className="h-11" />
      </div>
      <SelectField
        id={priceId}
        name="price"
        label="Precio"
        items={PRICE_ITEMS}
        defaultValue={ANY_PRICE}
      />
      <Button
        type="submit"
        className="h-11 gap-2 px-6 text-base motion-reduce:transition-none md:col-span-2 lg:col-span-1"
      >
        <Search aria-hidden="true" />
        Buscar
      </Button>
    </form>
  );
}
