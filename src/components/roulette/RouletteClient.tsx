"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TiltCard3D } from "@/components/ui/TiltCard3D";

interface PoolItem {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  outbound: string | null;
}

interface Props {
  pool: PoolItem[];
}

const MOODS = [
  { id: "make-something", label: "Make something", hint: "Build, write, design, or ship." },
  { id: "focus-better", label: "Focus better", hint: "Calm the noise, hold the line." },
  { id: "automate-boring", label: "Automate boring", hint: "Have software do it." },
  { id: "learn-fast", label: "Learn fast", hint: "Get smart on a topic this hour." },
  { id: "find-pretty", label: "Find pretty", hint: "Beautiful tools that you'll actually use." },
  { id: "spend-less", label: "Spend less", hint: "Free or near-free picks." },
];

// Per-mood category preferences. The roulette respects the mood + biases toward
// categories that fit, but still allows a wild card so it doesn't feel rigged.
const MOOD_CATEGORIES: Record<string, string[]> = {
  "make-something": ["Design", "Developer", "Writing", "Creative"],
  "focus-better": ["Productivity", "Health"],
  "automate-boring": ["Automation", "Developer", "Productivity"],
  "learn-fast": ["Education", "Research", "Reference", "Learning"],
  "find-pretty": ["Design", "Entertainment"],
  "spend-less": ["Finance", "Productivity"],
};

const USE_CASE_TEMPLATES: Record<string, string[]> = {
  "make-something": [
    "Spend 20 minutes drafting the thing you've been putting off.",
    "Open it. Use it on one real project in the next hour.",
    "Set a 25-min timer. Use this to finish a draft.",
  ],
  "focus-better": [
    "Try it tomorrow morning before your inbox.",
    "Open it during your worst-focus hour today.",
    "Use it for one deep-work block this week.",
  ],
  "automate-boring": [
    "Wire it up for the one task you do every week.",
    "Connect it to your existing stack today, even badly.",
    "Save it for the next time you say 'I should automate this'.",
  ],
  "learn-fast": [
    "Spend one lunch break exploring the basics.",
    "Read the intro, then make one tiny thing with it.",
    "Bookmark it for your next research session.",
  ],
  "find-pretty": [
    "Use it once just because it feels good.",
    "Replace the ugly one you've been tolerating.",
    "Show it to a friend who appreciates design.",
  ],
  "spend-less": [
    "Try the free tier this week.",
    "Compare it to whatever you're paying for now.",
    "Cancel something this replaces.",
  ],
  default: [
    "Open it. Use it for one task this week.",
    "Add it to your stack if it earns its slot.",
    "Worth ten minutes of exploration.",
  ],
};

const HISTORY_KEY = "surfaced.roulette.history";
const FAVES_KEY = "surfaced.roulette.faves";

function seededHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function RouletteClient({ pool }: Props) {
  const [mood, setMood] = useState<string>(MOODS[0].id);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<PoolItem | null>(null);
  const [useCase, setUseCase] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [faves, setFaves] = useState<string[]>([]);
  const spinTicker = useRef<number | null>(null);
  const [tickerSlug, setTickerSlug] = useState<string>(pool[0]?.slug ?? "");

  useEffect(() => {
    let raf = 0;
    try {
      const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const savedFaves = JSON.parse(localStorage.getItem(FAVES_KEY) || "[]");
      raf = requestAnimationFrame(() => {
        setHistory(savedHistory);
        setFaves(savedFaves);
      });
    } catch {}
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const filteredPool = useMemo(() => {
    const preferred = MOOD_CATEGORIES[mood] || [];
    if (preferred.length === 0) return pool;
    // 80% from preferred categories, 20% wild for variety
    const preferredItems = pool.filter((i) => preferred.includes(i.category));
    return preferredItems.length >= 5 ? preferredItems : pool;
  }, [mood, pool]);

  const spin = useCallback(() => {
    if (filteredPool.length === 0) return;
    setSpinning(true);
    setResult(null);
    setUseCase(null);

    // Visual ticker: rapidly cycle slug strings for ~1.4s
    const start = performance.now();
    const SPIN_MS = 1400;
    const tick = () => {
      const pick = filteredPool[Math.floor(Math.random() * filteredPool.length)];
      setTickerSlug(pick.slug);
      const elapsed = performance.now() - start;
      if (elapsed < SPIN_MS) {
        const delay = 30 + Math.pow(elapsed / SPIN_MS, 2) * 220;
        spinTicker.current = window.setTimeout(tick, delay);
      } else {
        // Final pick — avoid most-recent if possible
        let final = filteredPool[Math.floor(Math.random() * filteredPool.length)];
        if (history[0] === final.slug && filteredPool.length > 1) {
          let attempts = 0;
          while (final.slug === history[0] && attempts < 6) {
            final = filteredPool[Math.floor(Math.random() * filteredPool.length)];
            attempts++;
          }
        }
        setTickerSlug(final.slug);
        setResult(final);
        const templates = USE_CASE_TEMPLATES[mood] || USE_CASE_TEMPLATES.default;
        const idx = seededHash(final.slug + mood) % templates.length;
        setUseCase(templates[idx]);
        setSpinning(false);

        const newHistory = [final.slug, ...history.filter((s) => s !== final.slug)].slice(0, 12);
        setHistory(newHistory);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)); } catch {}
      }
    };
    tick();
  }, [filteredPool, mood, history]);

  const toggleFave = (slug: string) => {
    setFaves((curr) => {
      const next = curr.includes(slug) ? curr.filter((s) => s !== slug) : [slug, ...curr].slice(0, 30);
      try { localStorage.setItem(FAVES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Keyboard: space to spin, F to favorite
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === " " && !spinning) {
        e.preventDefault();
        spin();
      }
      if (e.key.toLowerCase() === "f" && result) {
        toggleFave(result.slug);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spinning, spin, result]);

  return (
    <div className="space-y-12">
      {/* Mood picker */}
      <div className="depth-grid flex flex-wrap justify-center gap-2.5">
        {MOODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMood(m.id)}
            data-cursor="hover"
            aria-pressed={mood === m.id}
            className={`magnetic px-4 py-2 rounded-full text-xs uppercase tracking-[0.18em] font-semibold border transition-all ${
              mood === m.id
                ? "bg-white text-black border-white shadow-[0_6px_24px_rgba(255,255,255,0.25)]"
                : "bg-white/8 text-white/85 border-white/15 hover:bg-white/15 hover:border-white/30"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-center text-white/65 text-sm">
        {MOODS.find((m) => m.id === mood)?.hint}
      </p>

      {/* Slot card */}
      <TiltCard3D className="mx-auto max-w-2xl rounded-3xl" glowColor="168, 85, 247" tiltDepth="strong" maxTilt={14}>
      <div className="floating-glass relative rounded-3xl p-8 sm:p-10 overflow-hidden">
        {/* Glow ring while spinning */}
        {spinning && (
          <div
            aria-hidden="true"
            className="absolute -inset-1 rounded-3xl pointer-events-none"
            style={{
              background: "conic-gradient(from 0deg, #a855f7, #22d3ee, #fbbf24, #fb7185, #a855f7)",
              filter: "blur(20px)",
              opacity: 0.6,
              animation: "spin-slow 1.4s linear infinite",
            }}
          />
        )}

        <div className="relative">
          {/* Ticker / Result */}
          <div className="depth-layer-2 min-h-[220px] flex flex-col justify-center">
            {!result && !spinning && (
              <p className="text-center text-white/60 italic">
                Press <kbd className="px-1.5 py-0.5 mx-1 rounded bg-white/15 text-white text-[10px] uppercase tracking-wider">space</kbd> or hit spin to begin.
              </p>
            )}
            {spinning && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55 mb-3">Spinning the world...</p>
                <p className="text-2xl sm:text-3xl font-bold text-white truncate transition-all">
                  {pool.find((p) => p.slug === tickerSlug)?.title ?? "…"}
                </p>
              </div>
            )}
            {result && !spinning && (
              <div className="text-center space-y-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/65 font-semibold">
                  {result.category} · today&rsquo;s spin
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{result.title}</h2>
                <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                  {result.excerpt}
                </p>
                {useCase && (
                  <p className="text-amber-200 text-sm sm:text-base font-medium italic">
                    &ldquo;{useCase}&rdquo;
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Link
                    href={`/item/${result.slug}`}
                    data-cursor="hover"
                    className="magnetic px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                  >
                    Read the take
                  </Link>
                  {result.outbound && (
                    <a
                      href={result.outbound}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-outbound="true"
                      data-cursor="hover"
                      className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-semibold border border-white/20 hover:bg-white/20 transition-colors"
                    >
                      Try it ↗
                    </a>
                  )}
                  <button
                    onClick={() => toggleFave(result.slug)}
                    data-cursor="hover"
                    aria-pressed={faves.includes(result.slug)}
                    aria-label={faves.includes(result.slug) ? "Remove from favourites" : "Save to favourites"}
                    className={`magnetic w-10 h-10 rounded-xl flex items-center justify-center text-sm border transition-all ${
                      faves.includes(result.slug)
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                    title={faves.includes(result.slug) ? "Saved (press F to unsave)" : "Save (press F)"}
                  >
                    ★
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={spin}
              data-cursor="hover"
              disabled={spinning}
              className="magnetic px-8 py-4 rounded-2xl bg-gradient-to-r from-accent to-cyan text-white text-base font-bold uppercase tracking-[0.18em] shadow-[0_10px_40px_rgba(168,85,247,0.4)] hover:shadow-[0_14px_56px_rgba(168,85,247,0.6)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {spinning ? "Spinning…" : result ? "Spin again" : "Spin"}
            </button>
          </div>
        </div>
      </div>
      </TiltCard3D>

      {/* History */}
      {history.length > 0 && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55 mb-3">Recent spins</p>
          <div className="depth-grid flex flex-wrap justify-center gap-2">
            {history.slice(0, 12).map((slug) => {
              const item = pool.find((p) => p.slug === slug);
              if (!item) return null;
              return (
                <Link
                  key={slug}
                  href={`/item/${slug}`}
                  data-cursor="hover"
                  className="magnetic px-3 py-1.5 rounded-full bg-white/8 hover:bg-white/15 text-white/85 text-xs border border-white/10 hover:border-white/25 transition-all"
                >
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Favourites */}
      {faves.length > 0 && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-200/85 mb-3">Your favourites</p>
          <div className="depth-grid flex flex-wrap justify-center gap-2">
            {faves.slice(0, 20).map((slug) => {
              const item = pool.find((p) => p.slug === slug);
              if (!item) return null;
              return (
                <Link
                  key={slug}
                  href={`/item/${slug}`}
                  data-cursor="hover"
                  className="magnetic px-3 py-1.5 rounded-full bg-amber-400/15 hover:bg-amber-400/25 text-amber-100 text-xs border border-amber-400/30 hover:border-amber-400/50 transition-all"
                >
                  ★ {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
