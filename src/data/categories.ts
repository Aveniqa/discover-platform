export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  count: number;
  color: "violet" | "cyan" | "amber" | "emerald" | "rose";
}

export const categories: Category[] = [
  {
    id: "c1",
    name: "AI & Machine Learning",
    slug: "ai-ml",
    description: "The latest in artificial intelligence, LLMs, and intelligent systems",
    icon: "🤖",
    count: 142,
    color: "violet",
  },
  {
    id: "c2",
    name: "Science & Discovery",
    slug: "science",
    description: "Breakthroughs, research, and fascinating findings",
    icon: "🔬",
    count: 98,
    color: "cyan",
  },
  {
    id: "c3",
    name: "Products & Gadgets",
    slug: "products",
    description: "Trending products, smart buys, and useful gear",
    icon: "📦",
    count: 215,
    color: "amber",
  },
  {
    id: "c4",
    name: "Internet Finds",
    slug: "internet-finds",
    description: "Hidden websites, tools, and corners of the internet",
    icon: "🌐",
    count: 187,
    color: "emerald",
  },
  {
    id: "c5",
    name: "Future Technology",
    slug: "future-tech",
    description: "What's coming next in tech, energy, and transportation",
    icon: "🚀",
    count: 76,
    color: "violet",
  },
  {
    id: "c6",
    name: "Design & Creative",
    slug: "design",
    description: "Tools, trends, and inspiration for creators",
    icon: "🎨",
    count: 64,
    color: "cyan",
  },
  {
    id: "c7",
    name: "Productivity",
    slug: "productivity",
    description: "Tools, systems, and methods to get more done",
    icon: "⚡",
    count: 112,
    color: "amber",
  },
  {
    id: "c8",
    name: "Culture & Society",
    slug: "culture",
    description: "Fascinating stories about how we live and think",
    icon: "🌍",
    count: 83,
    color: "rose",
  },
  {
    id: "c9",
    name: "Health & Wellness",
    slug: "health",
    description: "Science-backed insights for body and mind",
    icon: "🧬",
    count: 71,
    color: "emerald",
  },
  {
    id: "c10",
    name: "Space & Cosmos",
    slug: "space",
    description: "Exploration, discoveries, and the universe beyond",
    icon: "🌌",
    count: 45,
    color: "violet",
  },
  {
    id: "c11",
    name: "Finance & Money",
    slug: "finance",
    description: "Smart money moves, tools, and financial literacy",
    icon: "💰",
    count: 58,
    color: "emerald",
  },
  {
    id: "c12",
    name: "Developer Tools",
    slug: "dev-tools",
    description: "Frameworks, libraries, and tools for builders",
    icon: "💻",
    count: 134,
    color: "cyan",
  },
];
