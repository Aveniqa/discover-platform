export interface NavItem {
  label: string;
  href: string;
  description?: string;
  isNew?: boolean;
}

export const mainNav: NavItem[] = [
  { label: "Discover", href: "/discover", description: "Today's fascinating finds" },
  { label: "Trending", href: "/trending", description: "Products people are buying" },
  { label: "Hidden Gems", href: "/hidden-gems", description: "Internet's best-kept secrets" },
  { label: "Future Radar", href: "/future-radar", description: "What's coming next", isNew: true },
  { label: "Tools", href: "/tools", description: "Useful daily utilities" },
  { label: "Categories", href: "/categories", description: "Browse by topic" },
];

export const footerNav = {
  discover: [
    { label: "Today's Picks", href: "/discover" },
    { label: "Trending Products", href: "/trending" },
    { label: "Hidden Gems", href: "/hidden-gems" },
    { label: "Future Radar", href: "/future-radar" },
    { label: "Daily Tools", href: "/tools" },
    { label: "Categories", href: "/categories" },
  ],
  company: [
    { label: "About Surfaced", href: "/about" },
    { label: "Newsletter", href: "/newsletter" },
    { label: "Premium", href: "/premium" },
    { label: "Partnerships", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
  ],
};
