#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_PATH = path.join(ROOT, "public", "search-index.json");

const FILES = [
  ["discoveries.json", "discovery"],
  ["products.json", "product"],
  ["hidden-gems.json", "hidden-gem"],
  ["future-radar.json", "future-tech"],
  ["daily-tools.json", "tool"],
];

const TYPE_LABELS = {
  discovery: "Discovery",
  product: "Product",
  "hidden-gem": "Hidden Gem",
  "future-tech": "Future Tech",
  tool: "Tool",
};

const TYPE_COLORS = {
  discovery: "indigo",
  product: "emerald",
  "hidden-gem": "amber",
  "future-tech": "cyan",
  tool: "rose",
};

function compact(value, max = 260) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max - 30 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s]+$/, "")}...`;
}

function titleFor(item) {
  if (item.type === "hidden-gem") return item.name;
  if (item.type === "future-tech") return item.techName;
  if (item.type === "tool") return item.toolName;
  return item.title;
}

function descriptionFor(item) {
  if (item.type === "hidden-gem") return item.whatItDoes;
  if (item.type === "future-tech") return item.explanation;
  if (item.type === "tool") return item.whatItDoes;
  return item.shortDescription;
}

function categoryFor(item) {
  return item.type === "future-tech" ? item.industry : item.category;
}

async function readItems(file, type) {
  const items = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8"));
  return items.map((item) => ({ ...item, type: item.type || type }));
}

async function main() {
  const active = (await Promise.all(FILES.map(([file, type]) => readItems(file, type)))).flat();
  const archive = JSON.parse(await fs.readFile(path.join(DATA_DIR, "archive.json"), "utf8"));
  const bySlug = new Map();

  for (const item of [...active, ...archive]) {
    if (!item?.slug || bySlug.has(item.slug)) continue;
    bySlug.set(item.slug, {
      slug: item.slug,
      type: item.type,
      title: compact(titleFor(item), 140),
      description: compact(descriptionFor(item), 260),
      category: compact(categoryFor(item), 80),
      categoryLabel: TYPE_LABELS[item.type] || "Discovery",
      color: TYPE_COLORS[item.type] || "indigo",
    });
  }

  const index = Array.from(bySlug.values()).sort((a, b) => a.title.localeCompare(b.title));
  await fs.writeFile(OUT_PATH, `${JSON.stringify(index)}\n`);
  console.log(`Generated public/search-index.json with ${index.length} item(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
