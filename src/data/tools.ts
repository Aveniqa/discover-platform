export interface Tool {
  id: string;
  title: string;
  description: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  icon: string;
  url: string;
  isFree: boolean;
  featured?: boolean;
}

export const tools: Tool[] = [
  {
    id: "t1",
    title: "Pomodoro Focus Timer",
    description:
      "A beautifully minimal focus timer with ambient sounds, session tracking, and break reminders. Stay locked in.",
    category: "Productivity",
    tag: "Popular",
    tagColor: "violet",
    icon: "⏱",
    url: "#",
    isFree: true,
    featured: true,
  },
  {
    id: "t2",
    title: "Salary Comparison Calculator",
    description:
      "Compare cost-of-living adjusted salaries across 200+ cities worldwide. Factor in taxes, rent, and purchasing power.",
    category: "Finance",
    tag: "Essential",
    tagColor: "emerald",
    icon: "💰",
    url: "#",
    isFree: true,
    featured: true,
  },
  {
    id: "t3",
    title: "Color Palette Generator",
    description:
      "AI-powered color palette creation. Extract from images, generate from moods, export to Tailwind, CSS, or Figma.",
    category: "Design",
    tag: "Creative",
    tagColor: "cyan",
    icon: "🎨",
    url: "#",
    isFree: true,
    featured: true,
  },
  {
    id: "t4",
    title: "Meeting Cost Calculator",
    description:
      "Enter attendees and their salaries — see the real-time cost of your meeting ticking up. A powerful motivator for efficiency.",
    category: "Business",
    tag: "Eye-Opening",
    tagColor: "amber",
    icon: "📊",
    url: "#",
    isFree: true,
  },
  {
    id: "t5",
    title: "Habit Streak Tracker",
    description:
      "Track daily habits with a beautiful streak visualization. No sign-up required — data saves locally in your browser.",
    category: "Wellness",
    tag: "Daily Use",
    tagColor: "emerald",
    icon: "🔥",
    url: "#",
    isFree: true,
  },
  {
    id: "t6",
    title: "Screen Time Analyzer",
    description:
      "See a breakdown of how you actually spend time on your devices. AI-categorized, with weekly insights and improvement suggestions.",
    category: "Productivity",
    tag: "Useful",
    tagColor: "violet",
    icon: "📱",
    url: "#",
    isFree: true,
  },
  {
    id: "t7",
    title: "Decision Matrix Builder",
    description:
      "Weigh options systematically with a visual decision matrix. Score criteria, compare alternatives, and make better choices.",
    category: "Thinking Tools",
    tag: "Smart",
    tagColor: "cyan",
    icon: "🧠",
    url: "#",
    isFree: true,
  },
  {
    id: "t8",
    title: "Weekly Meal Planner",
    description:
      "Plan your week's meals with nutritional info, shopping list generation, and budget tracking. Supports dietary preferences.",
    category: "Health",
    tag: "Practical",
    tagColor: "emerald",
    icon: "🥗",
    url: "#",
    isFree: true,
  },
];
