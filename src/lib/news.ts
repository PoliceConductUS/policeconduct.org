export type NewsMeta = {
  badge?: string;
  date: string;
  description: string;
  href: string;
  title: string;
};

export { PAGE_SIZE } from "#src/lib/pagination.js";

const modules = import.meta.glob("../pages/news/**/index.astro", {
  eager: true,
});

export const loadNewsArticles = (): NewsMeta[] =>
  Object.values(modules)
    .map((module) => (module as { newsMeta?: NewsMeta }).newsMeta)
    .filter((entry): entry is NewsMeta => Boolean(entry))
    .sort((left, right) => right.date.localeCompare(left.date));

export const formatNewsDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });

export const newsBadgeClassName = (badge?: string) => {
  if (badge === "Coming Soon") {
    return "badge bg-secondary rounded-pill";
  }
  return "badge bg-dark rounded-pill";
};
