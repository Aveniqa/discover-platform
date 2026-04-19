import { getAllItems, type AnyItem } from "./data";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DailyEdition {
  date: string;
  items: AnyItem[];
  countByType: Record<string, number>;
}

export function getEditionDates(): string[] {
  const seen = new Set<string>();
  for (const item of getAllItems()) {
    const d = (item as AnyItem & { dateAdded?: string }).dateAdded;
    if (d && ISO_DATE.test(d)) seen.add(d);
  }
  return Array.from(seen).sort().reverse();
}

export function getEdition(date: string): DailyEdition | null {
  if (!ISO_DATE.test(date)) return null;
  const items = getAllItems().filter(
    (i) => (i as AnyItem & { dateAdded?: string }).dateAdded === date
  );
  if (items.length === 0) return null;
  const countByType: Record<string, number> = {};
  for (const i of items) countByType[i.type] = (countByType[i.type] || 0) + 1;
  return { date, items, countByType };
}

export function formatEditionDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
