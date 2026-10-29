import type { ItemSignals } from "@/lib/data";

type GithubSignals = NonNullable<ItemSignals["github"]>;

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatDay(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Live repository facts for open-source items — stars, last commit, license —
 * so a reader can judge whether a project is alive before they adopt it.
 * Server-rendered; dated, because the numbers drift between checks.
 */
export function ProjectSignals({ github, checkedAt }: { github: GithubSignals; checkedAt: string }) {
  const facts = [
    `★ ${compact.format(github.stars)} GitHub stars`,
    github.forks ? `${compact.format(github.forks)} forks` : null,
    github.pushedAt ? `Last commit ${formatDay(github.pushedAt)}` : null,
    github.license ? `${github.license} license` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mb-12 rounded-2xl border border-border bg-card/50 p-7 sm:p-10 editorial-block">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
        Project signals
      </p>
      <h2 className="text-xl sm:text-2xl font-black text-foreground mb-4">
        {github.archived ? "Archived by its maintainers" : "Is it still maintained?"}
      </h2>
      {github.archived && (
        <p className="text-muted-foreground leading-relaxed mb-4">
          The repository is read-only — it still works, but don&rsquo;t expect fixes or new features.
        </p>
      )}
      <ul className="flex flex-wrap gap-2 mb-5" aria-label="Repository facts">
        {facts.map((fact) => (
          <li
            key={fact}
            className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/[0.05] px-3 py-1 text-xs font-semibold text-foreground"
          >
            {fact}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        From{" "}
        <a
          href={`https://github.com/${github.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent/80 transition-colors"
        >
          github.com/{github.repo}
        </a>
        , checked {formatDay(checkedAt)}.
      </p>
    </div>
  );
}
