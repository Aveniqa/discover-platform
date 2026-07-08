import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { BYLINE } from "@/lib/masthead";
import { hiddenGems, dailyTools } from "@/lib/data";
import { alcoveByKind } from "@/lib/alcoves";
import { AlcoveBackdrop } from "@/components/3d/AlcoveBackdrop";

export const metadata: Metadata = buildMetadata({
  title: `About — ${BYLINE.name}`,
  description: `Surfaced is a one-person daily on the best software, hidden web apps, and tools worth your attention. Edited by ${BYLINE.name}.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <article>
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <AlcoveBackdrop alcove={alcoveByKind("default")} trackScroll />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70 font-semibold mb-4">
            About Surfaced
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[0.95]">
            One editor. <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">No slop.</span>
          </h1>
          <p className="mt-6 text-white/85 text-lg sm:text-xl leading-relaxed">
            Surfaced is a hand-edited daily on the most useful software and corners of the internet.
            Run by {BYLINE.name} out of {BYLINE.city}.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">Why this site exists</h2>
          <div className="space-y-5 text-muted-foreground text-lg leading-relaxed">
            <p>
              I&apos;ve worked in product and engineering for the last decade. The pattern I see again
              and again: smart people stuck on bad tools because the alternative was buried under
              twenty pages of SEO content marketing.
            </p>
            <p>
              The web doesn&apos;t need another &ldquo;25 best AI writing tools&rdquo; list. It needs an editor
              who has actually opened the apps, used them on a real project, and is willing to say
              which one to use and which to skip.
            </p>
            <p>
              Surfaced is that. One person, one opinion, one tool per day or so. Plus workflows
              that show how tools fit together — because most software problems are about which
              <em>three</em> tools to combine, not which one to buy.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-surface/40 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 tracking-tight">What you&apos;ll find here</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Pillar
              title="Daily Tools"
              href="/tools"
              n={dailyTools.length}
              body="Software for everyday work — productivity, dev, design, writing. Categorized into six alcoves so you can browse by mood, not just by tag."
            />
            <Pillar
              title="Hidden Gems"
              href="/hidden-gems"
              n={hiddenGems.length}
              body="Lesser-known web apps that are doing one thing remarkably well. The internet is bigger than the front page of Product Hunt."
            />
            <Pillar
              title="Workflows"
              href="/workflows"
              n={8}
              body="Tool recipes for real goals. &ldquo;Write a newsletter,&rdquo; &ldquo;design a logo,&rdquo; &ldquo;ship an indie SaaS.&rdquo; Three to five real tools, stitched in order."
            />
            <Pillar
              title="The archive"
              href="/categories"
              n="2k+"
              body="Every story Surfaced has ever published, preserved at its original URL. Old picks stay readable even after they leave the homepage."
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-background border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">How it gets made</h2>
          <div className="space-y-5 text-muted-foreground text-lg leading-relaxed">
            <p>
              I read RSS, scout Product Hunt and Hacker News, follow ~80 indie newsletters, and
              ignore everything that smells like content marketing. When something hits the bar, I
              open it, use it, and write up the take.
            </p>
            <p>
              AI helps me draft and check coverage gaps — same as Grammarly or a transcript tool.
              Every entry is edited by hand before it ships. I do not auto-publish.
            </p>
            <p>
              The full picking-and-writing methodology is on the{" "}
              <Link href="/editorial-standards" className="text-accent hover:underline">
                Editorial Standards
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-surface/40 border-t border-border/40">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-8">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
            {BYLINE.initials}
          </div>
          <div className="text-center sm:text-left flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">{BYLINE.role}</p>
            <h2 className="text-2xl sm:text-3xl font-bold">{BYLINE.name}</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{BYLINE.bio}</p>
            <div className="mt-4 flex gap-4 justify-center sm:justify-start text-sm">
              <a href={`mailto:${BYLINE.contactEmail}`} className="text-accent hover:underline">
                {BYLINE.contactEmail}
              </a>
              <a href={BYLINE.links.twitter} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Twitter
              </a>
              <Link href={BYLINE.links.rss} className="text-accent hover:underline">RSS</Link>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

function Pillar({ title, href, n, body }: { title: string; href: string; n: number | string; body: string }) {
  return (
    <Link href={href} className="group block p-6 rounded-2xl border border-border bg-card hover:border-accent/40 transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold group-hover:text-accent transition-colors">{title}</h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{n}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      <p className="mt-4 text-sm font-medium text-accent inline-flex items-center gap-1">
        Browse <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </p>
    </Link>
  );
}
