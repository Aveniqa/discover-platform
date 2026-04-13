export interface FutureItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  timeline: string;
  impact: "High" | "Very High" | "Transformative";
  image: string;
  source: string;
  featured?: boolean;
}

export const futureItems: FutureItem[] = [
  {
    id: "f1",
    title: "Brain-Computer Interfaces Go Consumer",
    description:
      "Neuralink's N1 chip has completed human trials. Synchron's Stentrode is already FDA-approved. By 2028, non-invasive BCIs could let you control devices with thought alone.",
    category: "Neurotechnology",
    tag: "2026–2028",
    tagColor: "violet",
    timeline: "2–4 years",
    impact: "Transformative",
    image: "/images/placeholder.jpg",
    source: "MIT Technology Review",
    featured: true,
  },
  {
    id: "f2",
    title: "Humanoid Robots Enter the Workforce",
    description:
      "Figure AI, Tesla Optimus, and 1X are deploying bipedal robots in warehouses and factories. Cost per unit is dropping below $20K — approaching car prices.",
    category: "Robotics",
    tag: "Happening Now",
    tagColor: "cyan",
    timeline: "1–3 years",
    impact: "Very High",
    image: "/images/placeholder.jpg",
    source: "Bloomberg",
    featured: true,
  },
  {
    id: "f3",
    title: "Nuclear Fusion Achieves Net Energy Gain",
    description:
      "Multiple private companies are racing toward commercial fusion. Commonwealth Fusion's SPARC tokamak is targeting first plasma in 2026 with net energy gain.",
    category: "Energy",
    tag: "2026–2030",
    tagColor: "amber",
    timeline: "2–6 years",
    impact: "Transformative",
    image: "/images/placeholder.jpg",
    source: "Nature",
    featured: true,
  },
  {
    id: "f4",
    title: "AI Agents Replace SaaS Workflows",
    description:
      "Autonomous AI agents that can browse, code, and execute multi-step tasks are replacing entire software categories. The SaaS unbundling has begun.",
    category: "Artificial Intelligence",
    tag: "Happening Now",
    tagColor: "violet",
    timeline: "Now",
    impact: "Very High",
    image: "/images/placeholder.jpg",
    source: "Sequoia Capital",
  },
  {
    id: "f5",
    title: "Lab-Grown Organs Reach Clinical Trials",
    description:
      "Bioprinted kidneys, lab-grown heart tissue, and 3D-printed bones are entering Phase II clinical trials. The organ transplant waitlist could be eliminated within a decade.",
    category: "Healthcare",
    tag: "2027–2032",
    tagColor: "emerald",
    timeline: "3–8 years",
    impact: "Transformative",
    image: "/images/placeholder.jpg",
    source: "The Lancet",
  },
  {
    id: "f6",
    title: "Solid-State Batteries Hit Mass Production",
    description:
      "Toyota, Samsung SDI, and QuantumScape are scaling solid-state batteries with 2x energy density and 10-minute charging. EVs with 600+ mile range by 2027.",
    category: "Transportation",
    tag: "2026–2027",
    tagColor: "cyan",
    timeline: "1–3 years",
    impact: "Very High",
    image: "/images/placeholder.jpg",
    source: "Reuters",
  },
];
