export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ponytail: random 8-hex suffix, a collision would surface as the slug unique-constraint error.
export function buildUniqueSlug(title: string): string {
  const base = slugify(title) || "evento";
  return `${base}-${crypto.randomUUID().split("-")[0]}`;
}
