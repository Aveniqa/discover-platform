/**
 * Per-category "alcove" presets used by the 3D scene system. Each entry tints
 * the same shader with its own palette + motif. Keeping this in one file lets
 * the homepage rotate alcoves and lets every item page pick the right alcove
 * from its category without each route owning a separate scene file.
 */

export type AlcoveKind =
  | "ai"
  | "writing"
  | "design"
  | "developer"
  | "productivity"
  | "research"
  | "audio"
  | "education"
  | "finance"
  | "social"
  | "security"
  | "marketing"
  | "data"
  | "collaboration"
  | "entertainment"
  | "health"
  | "default";

export interface Alcove {
  kind: AlcoveKind;
  label: string;
  /** Short editorial blurb shown above the alcove on category landings */
  tagline: string;
  /** Hero-side palette: three hex colors used as shader inputs */
  palette: [string, string, string];
  /** Background base for the deep-tone scrim */
  base: string;
  /** Motif name — used by the 3D scene to pick shape behavior */
  motif: "orbit" | "lattice" | "ripple" | "particles" | "prism" | "gem";
  /** Single short sentence the SR/text fallback reads */
  altText: string;
}

const _alcoves: Record<AlcoveKind, Alcove> = {
  ai: {
    kind: "ai",
    label: "AI",
    tagline: "Models, agents, and the tools that point them at real work.",
    palette: ["#8b5cf6", "#06b6d4", "#0b0820"],
    base: "#070611",
    motif: "lattice",
    altText: "Geometric lattice pulsing in violet and cyan",
  },
  writing: {
    kind: "writing",
    label: "Writing",
    tagline: "From first draft to final word — tools that get out of the way.",
    palette: ["#f59e0b", "#fb7185", "#120912"],
    base: "#0a0710",
    motif: "ripple",
    altText: "Slow concentric ripples in amber and rose",
  },
  design: {
    kind: "design",
    label: "Design",
    tagline: "Vectors, color, type, motion — the craft layer.",
    palette: ["#22d3ee", "#a855f7", "#0c0a18"],
    base: "#060814",
    motif: "prism",
    altText: "Refracting prism of cyan and violet light",
  },
  developer: {
    kind: "developer",
    label: "Developer",
    tagline: "Compilers, editors, infra — the substrate of the modern web.",
    palette: ["#34d399", "#22d3ee", "#08120f"],
    base: "#050a08",
    motif: "particles",
    altText: "Floating particle network in emerald and cyan",
  },
  productivity: {
    kind: "productivity",
    label: "Productivity",
    tagline: "Calendars, notes, focus — quiet tools that compound.",
    palette: ["#fbbf24", "#34d399", "#11100a"],
    base: "#0b0a05",
    motif: "orbit",
    altText: "Orbiting amber discs over emerald glow",
  },
  research: {
    kind: "research",
    label: "Research",
    tagline: "Search engines, citation graphs, knowledge maps.",
    palette: ["#06b6d4", "#6366f1", "#080a18"],
    base: "#06080f",
    motif: "lattice",
    altText: "Indigo grid suspended in cyan haze",
  },
  audio: {
    kind: "audio",
    label: "Audio",
    tagline: "Capture, edit, mix — every tool that touches sound.",
    palette: ["#fb7185", "#fbbf24", "#100610"],
    base: "#0a050a",
    motif: "ripple",
    altText: "Sound-wave ripples in rose and amber",
  },
  education: {
    kind: "education",
    label: "Education",
    tagline: "Learning by doing, on your own schedule.",
    palette: ["#22d3ee", "#fbbf24", "#0a0a14"],
    base: "#070710",
    motif: "particles",
    altText: "Floating particles tinted cyan and amber",
  },
  finance: {
    kind: "finance",
    label: "Finance",
    tagline: "Budgets, taxes, markets — money tooling without the cruft.",
    palette: ["#34d399", "#8b5cf6", "#08110a"],
    base: "#060c08",
    motif: "orbit",
    altText: "Emerald and violet orbiting discs",
  },
  social: {
    kind: "social",
    label: "Social",
    tagline: "Communities, identities, signals.",
    palette: ["#a855f7", "#fb7185", "#0e0a12"],
    base: "#0a070e",
    motif: "particles",
    altText: "Particles drifting in violet and rose",
  },
  security: {
    kind: "security",
    label: "Security",
    tagline: "Passwords, privacy, threat hunting.",
    palette: ["#22d3ee", "#34d399", "#06080d"],
    base: "#04060a",
    motif: "lattice",
    altText: "Tight cyan lattice over emerald glow",
  },
  marketing: {
    kind: "marketing",
    label: "Marketing",
    tagline: "Reach, attribution, content engines.",
    palette: ["#fb7185", "#8b5cf6", "#100610"],
    base: "#0a050a",
    motif: "ripple",
    altText: "Pink and violet pulse rings",
  },
  data: {
    kind: "data",
    label: "Data",
    tagline: "Pipelines, dashboards, the long road from raw to insight.",
    palette: ["#06b6d4", "#34d399", "#070d10"],
    base: "#06090c",
    motif: "lattice",
    altText: "Cyan grid receding into dark",
  },
  collaboration: {
    kind: "collaboration",
    label: "Collaboration",
    tagline: "Where teams meet, write, and ship together.",
    palette: ["#8b5cf6", "#fbbf24", "#100b14"],
    base: "#080610",
    motif: "orbit",
    altText: "Violet rings orbiting an amber core",
  },
  entertainment: {
    kind: "entertainment",
    label: "Entertainment",
    tagline: "The corners of the internet that exist for fun.",
    palette: ["#fb7185", "#22d3ee", "#100610"],
    base: "#0a050c",
    motif: "gem",
    altText: "Floating gem facets in rose and cyan",
  },
  health: {
    kind: "health",
    label: "Health",
    tagline: "Sleep, movement, mental health — software that supports you.",
    palette: ["#34d399", "#fbbf24", "#08120c"],
    base: "#050b08",
    motif: "ripple",
    altText: "Soft green ripples over warm core",
  },
  default: {
    kind: "default",
    label: "Surfaced",
    tagline: "Hand-picked software and corners of the internet worth your time.",
    palette: ["#a855f7", "#22d3ee", "#08080c"],
    base: "#06060a",
    motif: "orbit",
    altText: "Slow drift of violet and cyan light",
  },
};

const categoryAliases: Record<string, AlcoveKind> = {
  ai: "ai",
  artificial: "ai",
  machine: "ai",
  writing: "writing",
  notes: "writing",
  prose: "writing",
  design: "design",
  graphics: "design",
  ui: "design",
  developer: "developer",
  dev: "developer",
  code: "developer",
  engineering: "developer",
  productivity: "productivity",
  focus: "productivity",
  task: "productivity",
  research: "research",
  reference: "research",
  knowledge: "research",
  audio: "audio",
  music: "audio",
  sound: "audio",
  education: "education",
  learning: "education",
  course: "education",
  finance: "finance",
  money: "finance",
  social: "social",
  community: "social",
  security: "security",
  privacy: "security",
  marketing: "marketing",
  growth: "marketing",
  data: "data",
  analytics: "data",
  collaboration: "collaboration",
  team: "collaboration",
  meeting: "collaboration",
  entertainment: "entertainment",
  fun: "entertainment",
  game: "entertainment",
  health: "health",
  wellness: "health",
  mental: "health",
  fitness: "health",
};

export function alcoveFromCategory(category: string | null | undefined): Alcove {
  if (!category) return _alcoves.default;
  const lower = category.toLowerCase();
  for (const [needle, kind] of Object.entries(categoryAliases)) {
    if (lower.includes(needle)) return _alcoves[kind];
  }
  return _alcoves.default;
}

export function alcoveByKind(kind: AlcoveKind): Alcove {
  return _alcoves[kind] ?? _alcoves.default;
}

export function allAlcoves(): Alcove[] {
  return Object.values(_alcoves).filter((a) => a.kind !== "default");
}

export const heroAlcoveRotation: AlcoveKind[] = [
  "ai",
  "design",
  "writing",
  "developer",
  "productivity",
  "audio",
];
