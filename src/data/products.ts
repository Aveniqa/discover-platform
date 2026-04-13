export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  rating: number;
  reviews: string;
  image: string;
  affiliateUrl: string;
  featured?: boolean;
}

export const products: Product[] = [
  {
    id: "p1",
    title: "Arc'teryx Atom Hoody LT",
    description:
      "The internet's favorite technical layer. Breathable Coreloft insulation meets a clean minimal design that works from trailhead to office.",
    price: "$259",
    category: "Apparel",
    tag: "Bestseller",
    tagColor: "amber",
    rating: 4.8,
    reviews: "12.4k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
    featured: true,
  },
  {
    id: "p2",
    title: "Oura Ring Gen 4",
    description:
      "The most advanced health tracker that fits on your finger. Sleep staging, HRV, SpO2, temperature sensing — all with 7-day battery life.",
    price: "$349",
    category: "Wearables",
    tag: "Trending",
    tagColor: "violet",
    rating: 4.6,
    reviews: "8.2k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
    featured: true,
  },
  {
    id: "p3",
    title: "Remarkable 2 Paper Tablet",
    description:
      "The paper-like writing tablet with zero distractions. E-ink display, real pen feel, infinite notebooks. Loved by writers, thinkers, and note-takers.",
    price: "$449",
    originalPrice: "$549",
    category: "Tech",
    tag: "Editor's Pick",
    tagColor: "cyan",
    rating: 4.5,
    reviews: "6.1k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
    featured: true,
  },
  {
    id: "p4",
    title: "Stanley Quencher H2.0 Tumbler",
    description:
      "The viral 40oz tumbler that broke the internet. Double-wall vacuum insulation keeps drinks cold for 11 hours. Fits any car cup holder.",
    price: "$35",
    category: "Lifestyle",
    tag: "Viral",
    tagColor: "rose",
    rating: 4.7,
    reviews: "42.8k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
  },
  {
    id: "p5",
    title: "Dyson Airwrap Multi-Styler",
    description:
      "Curl, wave, smooth, and dry with no extreme heat. The Coanda effect wraps hair using air, not damage. 6 attachments for every style.",
    price: "$599",
    category: "Beauty",
    tag: "Premium Pick",
    tagColor: "violet",
    rating: 4.4,
    reviews: "18.3k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
  },
  {
    id: "p6",
    title: "Bellroy Tech Kit Compact",
    description:
      "Woven recycled fabric, magnetic closure, perfectly sized internal pockets. The most elegant way to carry your cables, chargers, and dongles.",
    price: "$59",
    category: "Accessories",
    tag: "Sleeper Hit",
    tagColor: "emerald",
    rating: 4.7,
    reviews: "3.4k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
  },
  {
    id: "p7",
    title: "Apple AirPods Pro 3",
    description:
      "Adaptive audio with personalized spatial sound. H3 chip delivers 2x better noise cancellation and hearing health features built in.",
    price: "$249",
    category: "Audio",
    tag: "Just Dropped",
    tagColor: "cyan",
    rating: 4.8,
    reviews: "24.7k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
  },
  {
    id: "p8",
    title: "Humanscale Freedom Chair",
    description:
      "Self-adjusting office chair that responds to your body weight and movements. No knobs, no levers — just sit and it configures itself.",
    price: "$1,249",
    originalPrice: "$1,499",
    category: "Home Office",
    tag: "Investment",
    tagColor: "amber",
    rating: 4.6,
    reviews: "2.8k",
    image: "/images/placeholder.jpg",
    affiliateUrl: "#",
  },
];
