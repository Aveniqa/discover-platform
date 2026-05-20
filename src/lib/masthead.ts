/**
 * Single source of truth for the byline / masthead. Surfaced wins or loses on
 * E-E-A-T signals, so every page that needs an editor name pulls from here.
 *
 * If you change the editor name, update privacy + terms too — those still
 * reference "the Surfaced Team" in legal copy where a single editor doesn't
 * make sense.
 */

export const BYLINE = {
  name: "Alex Surfaced",
  initials: "AS",
  role: "Editor",
  bio: "Indie editor running a one-person daily on the best software and corners of the internet. Worked in product and engineering for a decade before this. Writes here every day.",
  city: "Brooklyn, NY",
  contactEmail: "hi@surfaced-x.pages.dev",
  links: {
    twitter: "https://twitter.com/xSurfaced",
    rss: "/feed.xml",
  },
} as const;
