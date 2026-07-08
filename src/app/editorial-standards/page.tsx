import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { BYLINE } from "@/lib/masthead";

export const metadata: Metadata = buildMetadata({
  title: "Editorial Standards",
  description:
    "How Surfaced picks, tests, and writes about software. Sourcing, conflict-of-interest, AI use, and what disqualifies a tool from inclusion.",
  path: "/editorial-standards",
});

const sections = [
  {
    h: "How a tool earns a slot",
    body: [
      "Every tool that appears on Surfaced has been opened, used, and compared against the alternatives in its category. If I can't show you the official site, the use case, and the trade-off vs. similar tools, it doesn't ship.",
      "I add roughly 2-5 tools per week, not 50. The bar is: would I actually use this myself, or recommend it to someone I respect?",
    ],
  },
  {
    h: "Sourcing",
    body: [
      "Every item links to the official site or the maker's primary domain. No referral-link chains, no &quot;via X aggregator&quot; redirects.",
      "When a tool is open-source, the canonical link is the GitHub/GitLab repo, not a hosted version. When a tool is paid, I disclose the price tier I'm referring to.",
    ],
  },
  {
    h: "Conflicts of interest",
    body: [
      "Surfaced has no paid placements. Nothing on the site has been pushed by a vendor, agency, or PR firm.",
      "Some product links use Amazon affiliate IDs. These are disclosed on the /affiliate-disclosure page and never affect which tools get covered or how they're described.",
      "If I have a personal relationship with a tool's maker, I disclose it inline.",
    ],
  },
  {
    h: "How AI is used here",
    body: [
      "AI helps me draft, summarize, and check coverage gaps — the same way most editors use Grammarly, Notion AI, or a transcript tool. Every published entry is reviewed and edited by me before it goes live.",
      "I do not auto-publish AI output. The site does not generate new entries while I sleep — daily updates queue for review and ship after I've read them.",
      "If an entry is later improved or corrected, the change is noted in the page footer with a date.",
    ],
  },
  {
    h: "Corrections",
    body: [
      "Spotted something wrong? Email me at the address below. I fix factual errors within 24 hours of seeing the report and add a correction note to the page.",
    ],
  },
  {
    h: "What disqualifies a tool",
    body: [
      "Pyramid-scheme / MLM business models, regardless of the actual product.",
      "Vendors who have been credibly accused of harassment, data abuse, or knowingly shipping deceptive features.",
      "Products that exist primarily as content for an affiliate-link funnel, with no real user base.",
      "Tools whose privacy practices materially conflict with how they're marketed (the &quot;we don't sell your data&quot; product whose ToS says otherwise).",
    ],
  },
];

export default function EditorialStandardsPage() {
  return (
    <article className="bg-background">
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 border-b border-border/40">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.22em] text-accent font-semibold mb-4">
            Editorial Standards
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
            How Surfaced picks, tests, and writes about software.
          </h1>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            Read this if you want to know exactly how the sausage is made — what
            gets covered, what gets cut, and what would get a tool removed if I learned about it later.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-14">
          {sections.map((s) => (
            <div key={s.h}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-5 tracking-tight">{s.h}</h2>
              <div className="space-y-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
                {s.body.map((p, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 border-t border-border/40 bg-surface/40">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
            {BYLINE.initials}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Edited by</p>
          <h2 className="text-xl font-bold">{BYLINE.name}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
            {BYLINE.bio}
          </p>
          <div className="mt-5 flex gap-3 justify-center text-sm">
            <a href={`mailto:${BYLINE.contactEmail}`} className="text-accent hover:underline">
              {BYLINE.contactEmail}
            </a>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/about" className="text-accent hover:underline">About</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/contact" className="text-accent hover:underline">Contact</Link>
          </div>
        </div>
      </section>
    </article>
  );
}
