export interface HiddenGem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  upvotes: number;
  image: string;
  featured?: boolean;
}

export const hiddenGems: HiddenGem[] = [
  {
    id: "hg1",
    title: "Perplexity AI",
    description:
      "An AI-powered search engine that gives you real answers with citations instead of a list of blue links. Conversational, fast, and surprisingly accurate.",
    url: "perplexity.ai",
    category: "AI Tools",
    tag: "Must Try",
    tagColor: "violet",
    upvotes: 4820,
    image: "/images/placeholder.jpg",
    featured: true,
  },
  {
    id: "hg2",
    title: "Tldraw",
    description:
      "A beautiful infinite canvas whiteboard that runs in your browser. Collaborative, fast, open-source. Think Figma meets a napkin sketch.",
    url: "tldraw.com",
    category: "Design Tools",
    tag: "Hidden Gem",
    tagColor: "cyan",
    upvotes: 3200,
    image: "/images/placeholder.jpg",
    featured: true,
  },
  {
    id: "hg3",
    title: "Pika Art",
    description:
      "Turn any text prompt or image into cinematic video. The AI video generation tool that's rivaling professional production studios.",
    url: "pika.art",
    category: "AI Creative",
    tag: "Game Changer",
    tagColor: "amber",
    upvotes: 5100,
    image: "/images/placeholder.jpg",
    featured: true,
  },
  {
    id: "hg4",
    title: "Excalidraw",
    description:
      "Hand-drawn style diagrams and wireframes in your browser. Collaborative, exportable, and endlessly charming. Engineers and designers love it.",
    url: "excalidraw.com",
    category: "Productivity",
    tag: "Underrated",
    tagColor: "emerald",
    upvotes: 3800,
    image: "/images/placeholder.jpg",
  },
  {
    id: "hg5",
    title: "Radio Garden",
    description:
      "Spin a 3D globe and tune into live radio stations from anywhere on Earth. Tokyo jazz, Brazilian funk, Norwegian ambient — all one click away.",
    url: "radio.garden",
    category: "Entertainment",
    tag: "Magical",
    tagColor: "violet",
    upvotes: 6400,
    image: "/images/placeholder.jpg",
  },
  {
    id: "hg6",
    title: "Photopea",
    description:
      "A full Photoshop clone that runs entirely in your browser. Supports PSD, XCF, Sketch files. Free, fast, and shockingly capable.",
    url: "photopea.com",
    category: "Design Tools",
    tag: "Free & Powerful",
    tagColor: "cyan",
    upvotes: 4100,
    image: "/images/placeholder.jpg",
  },
  {
    id: "hg7",
    title: "Every Noise at Once",
    description:
      "An algorithmically-generated scatter plot of every music genre. Click any genre to hear a sample. The most fascinating music discovery tool ever built.",
    url: "everynoise.com",
    category: "Music",
    tag: "Rabbit Hole",
    tagColor: "rose",
    upvotes: 2900,
    image: "/images/placeholder.jpg",
  },
  {
    id: "hg8",
    title: "Monkeytype",
    description:
      "A minimalist, customizable typing test with themes, modes, and stats tracking. The most aesthetically pleasing way to improve your WPM.",
    url: "monkeytype.com",
    category: "Productivity",
    tag: "Addictive",
    tagColor: "amber",
    upvotes: 3500,
    image: "/images/placeholder.jpg",
  },
];
