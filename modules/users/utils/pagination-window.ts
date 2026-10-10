// First, last and `radius` pages around the current one; null marks a gap.
export function paginationWindow(page: number, totalPages: number, radius = 2): (number | null)[] {
  const items: (number | null)[] = [];
  let previous = 0;
  for (let number = 1; number <= totalPages; number++) {
    if (number !== 1 && number !== totalPages && Math.abs(number - page) > radius) continue;
    if (number - previous > 1) items.push(null);
    items.push(number);
    previous = number;
  }
  return items;
}
