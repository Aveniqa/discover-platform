export interface NavItem {
  label: string;
  href: string;
  description?: string;
  isNew?: boolean;
}

export const mainNav: NavItem[] = [
  { label: "Today", href: "/", description: "Today's edition" },
  { label: "Tools", href: "/tools", description: "Software for everyday work" },
  { label: "Hidden Gems", href: "/hidden-gems", description: "Underrated corners of the internet" },
  { label: "Workflows", href: "/workflows", description: "Stitched tool recipes" },
  { label: "Roulette", href: "/roulette", description: "Spin to discover a tool", isNew: true },
  { label: "Collections", href: "/collections", description: "Curated themed groups" },
  { label: "Archive", href: "/categories", description: "Everything Surfaced has covered" },
];

export const footerNav = {
  discover: [
    { label: "Today's Edition", href: "/" },
    { label: "Tools", href: "/tools" },
    { label: "Hidden Gems", href: "/hidden-gems" },
    { label: "Workflows", href: "/workflows" },
    { label: "Tool Roulette", href: "/roulette" },
    { label: "Collections", href: "/collections" },
    { label: "Archive", href: "/categories" },
  ],
  company: [
    { label: "About Surfaced", href: "/about" },
    { label: "Editorial Standards", href: "/editorial-standards" },
    { label: "Newsletter", href: "/newsletter" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
  ],
};
