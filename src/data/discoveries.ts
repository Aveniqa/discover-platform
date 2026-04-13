export interface Discovery {
  id: string;
  title: string;
  description: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  image: string;
  source: string;
  readTime: string;
  featured?: boolean;
  date: string;
}

export const discoveries: Discovery[] = [
  {
    id: "1",
    title: "Scientists Just Created a Battery That Lasts 50 Years",
    description:
      "A breakthrough nuclear diamond battery could power devices for half a century without ever needing a charge. The technology converts radioactive carbon-14 into a diamond structure that generates electricity continuously.",
    category: "Science",
    tag: "Breakthrough",
    tagColor: "cyan",
    image: "/images/placeholder.jpg",
    source: "Nature Energy",
    readTime: "3 min",
    featured: true,
    date: "Today",
  },
  {
    id: "2",
    title: "The Japanese Town That Produces Zero Waste",
    description:
      "Kamikatsu has achieved a 80% recycling rate with 45 waste categories. Residents wash, sort, and bring their own trash to the collection center — and they're aiming for 100% by 2030.",
    category: "Culture",
    tag: "Worth Knowing",
    tagColor: "emerald",
    image: "/images/placeholder.jpg",
    source: "BBC Future",
    readTime: "4 min",
    featured: true,
    date: "Today",
  },
  {
    id: "3",
    title: "Your Brain Literally Rewires Itself While You Sleep",
    description:
      "New neuroimaging research reveals that deep sleep triggers a massive reorganization of synaptic connections. Your brain is essentially rebuilding its own architecture every single night.",
    category: "Science",
    tag: "Fascinating",
    tagColor: "violet",
    image: "/images/placeholder.jpg",
    source: "Cell Reports",
    readTime: "5 min",
    featured: false,
    date: "Today",
  },
  {
    id: "4",
    title: "This Free AI Tool Turns Any Photo Into a 3D Scene",
    description:
      "LumaAI's new Gaussian Splatting model creates photorealistic 3D environments from a handful of phone photos. It runs in your browser and exports to game engines.",
    category: "AI & Tech",
    tag: "Tool Alert",
    tagColor: "amber",
    image: "/images/placeholder.jpg",
    source: "Product Hunt",
    readTime: "2 min",
    featured: false,
    date: "Today",
  },
  {
    id: "5",
    title: "There's a Country Where the Internet is a Constitutional Right",
    description:
      "Estonia has enshrined internet access as a fundamental human right since 2000. Today, 99% of government services are online, and citizens vote from their phones.",
    category: "Culture",
    tag: "Worth Knowing",
    tagColor: "emerald",
    image: "/images/placeholder.jpg",
    source: "Wired",
    readTime: "4 min",
    featured: false,
    date: "Yesterday",
  },
  {
    id: "6",
    title: "NASA's New Ion Drive Could Reach Mars in 6 Weeks",
    description:
      "The NEXT-C ion thruster generates 10x the efficiency of chemical rockets. Paired with nuclear power, it could compress the Mars transit from 9 months to under 45 days.",
    category: "Space",
    tag: "Future Tech",
    tagColor: "cyan",
    image: "/images/placeholder.jpg",
    source: "NASA JPL",
    readTime: "3 min",
    featured: false,
    date: "Yesterday",
  },
  {
    id: "7",
    title: "The Psychology of Why Round Numbers Feel Better",
    description:
      "Research from Columbia Business School reveals that humans are neurologically drawn to round numbers — and marketers exploit this in pricing, goals, and milestones.",
    category: "Psychology",
    tag: "Fascinating",
    tagColor: "violet",
    image: "/images/placeholder.jpg",
    source: "Harvard Business Review",
    readTime: "3 min",
    featured: false,
    date: "2 days ago",
  },
  {
    id: "8",
    title: "A 17-Year-Old Built a Reactor That Could Solve Fusion",
    description:
      "Sam Zeloof's garage semiconductor fab has evolved into a serious fusion research project. His latest tokamak prototype achieved plasma confinement for 0.3 seconds — in a suburban home.",
    category: "Innovation",
    tag: "Breakthrough",
    tagColor: "cyan",
    image: "/images/placeholder.jpg",
    source: "MIT Technology Review",
    readTime: "5 min",
    featured: false,
    date: "2 days ago",
  },
];
