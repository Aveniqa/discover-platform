"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { copyToClipboard, getSiteUrl } from "@/lib/engagement";
import {
  parseSurfacedScoreState,
  surfacedScoreCompletionKey,
  SURFACED_SCORE_STORAGE_KEY,
} from "@/lib/surfaced-score";

interface LiveBriefShareProps {
  eventId: string;
  dateKey: string;
  title: string;
  summary: string;
  label: string;
  sourceName: string;
  editorialStrength: number;
  editorialLabel: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value: string, maxLength: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?]*$/, "")}...`;
  }
  return lines;
}

function buildPreviewSvg({
  title,
  summary,
  label,
  sourceName,
  editorialStrength,
  scoreLine,
}: {
  title: string;
  summary: string;
  label: string;
  sourceName: string;
  editorialStrength: number;
  scoreLine: string | null;
}): string {
  const titleLines = wrapText(title, 34, 3);
  const summaryLines = wrapText(summary, 58, 3);
  const score = scoreLine || "Daily Insight ready";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#07090d"/>
  <rect x="44" y="44" width="1112" height="542" rx="34" fill="#101720" stroke="#263342"/>
  <circle cx="1020" cy="108" r="170" fill="#1dd8a6" opacity=".15"/>
  <circle cx="170" cy="570" r="190" fill="#47a3ff" opacity=".12"/>
  <text x="92" y="116" fill="#65ffc8" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="5">${escapeXml(label.toUpperCase())}</text>
  ${titleLines.map((line, index) => `<text x="92" y="${190 + index * 62}" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900">${escapeXml(line)}</text>`).join("")}
  ${summaryLines.map((line, index) => `<text x="92" y="${405 + index * 34}" fill="#b7c0ce" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="500">${escapeXml(line)}</text>`).join("")}
  <rect x="92" y="512" width="300" height="54" rx="27" fill="#19352f" stroke="#2c6657"/>
  <text x="118" y="548" fill="#a9f8dd" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="800">${escapeXml(score)}</text>
  <text x="790" y="548" fill="#d9e2ee" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800">Surfaced ${editorialStrength}/100</text>
  <text x="92" y="92" fill="#6d7788" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(sourceName)}</text>
</svg>`;
}

function subscribeScoreStore(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function readScoreSnapshot(): string {
  return window.localStorage.getItem(SURFACED_SCORE_STORAGE_KEY) || "";
}

function readServerScoreSnapshot(): string {
  return "";
}

export function LiveBriefShare({
  eventId,
  dateKey,
  title,
  summary,
  label,
  sourceName,
  editorialStrength,
  editorialLabel,
}: LiveBriefShareProps) {
  const scoreSnapshot = useSyncExternalStore(
    subscribeScoreStore,
    readScoreSnapshot,
    readServerScoreSnapshot,
  );
  const scoreState = useMemo(() => parseSurfacedScoreState(scoreSnapshot), [scoreSnapshot]);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  const completion = scoreState.completed[surfacedScoreCompletionKey(dateKey, eventId)];
  const url = `${getSiteUrl()}/live/${eventId}`;
  const scoreLine = completion
    ? `${scoreState.score} pts / ${scoreState.streak} day streak`
    : null;
  const compactSummary = useMemo(() => {
    const normalized = summary.replace(/\s+/g, " ").trim();
    if (normalized.length <= 138) return normalized;
    return `${normalized.slice(0, 135).replace(/[.,;:!?]*$/, "")}...`;
  }, [summary]);
  const shareText = useMemo(() => {
    const score = scoreLine ? `\nSurfaced Score: ${scoreLine}${completion?.correct ? " (correct)" : ""}` : "";
    return `${title}\n\n${compactSummary}${score}\n\nSurfaced Live Brief`;
  }, [compactSummary, completion?.correct, scoreLine, title]);
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(`${shareText}\n${url}`)}`;

  async function shareNative() {
    const shareData: ShareData = { title, text: shareText, url };

    try {
      if (navigator.share) {
        const svg = buildPreviewSvg({ title, summary, label, sourceName, editorialStrength, scoreLine });
        const file = new File([svg], `surfaced-${eventId}.svg`, { type: "image/svg+xml" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
        } else {
          await navigator.share(shareData);
        }
        setNotice("Share sheet opened.");
        return;
      }
    } catch {
      setNotice("");
      return;
    }

    window.open(xUrl, "_blank", "noopener,noreferrer");
  }

  async function copyShareText() {
    const ok = await copyToClipboard(`${shareText}\n${url}`);
    if (!ok) return;
    setCopied(true);
    setNotice("Share copy saved to clipboard.");
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <section className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-5" aria-labelledby="live-share-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
            Share brief
          </p>
          <h2 id="live-share-heading" className="mt-1 text-base font-black tracking-tight text-foreground">
            Social preview
          </h2>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-background/35 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
          {editorialStrength}/100 {editorialLabel}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background/45">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_right,rgba(92,255,191,0.16),transparent_42%),linear-gradient(135deg,rgba(10,16,24,0.94),rgba(20,27,38,0.92))] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
              {label}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Surfaced Live
            </span>
          </div>
          <p className="mt-3 text-sm font-black leading-snug text-foreground">
            {title}
          </p>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
            {summary}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {sourceName}
            </span>
            {scoreLine ? (
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-bold text-emerald-100">
                Surfaced Score: {scoreLine}
              </span>
            ) : (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                Daily Insight ready
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={shareNative}
          className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2.5 text-xs font-black text-black transition-colors hover:bg-white/90"
        >
          Native share
        </button>
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background/35 px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-emerald-300/35"
        >
          Share to X
        </a>
        <a
          href={threadsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background/35 px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-emerald-300/35"
        >
          Share to Threads
        </a>
        <button
          type="button"
          onClick={copyShareText}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background/35 px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-emerald-300/35"
        >
          {copied ? "Copied" : "Copy text"}
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground" aria-live="polite">
        {notice || "Native share uses your device share sheet when available; X and Threads use web intents."}
      </p>
    </section>
  );
}
