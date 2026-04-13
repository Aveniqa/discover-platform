"use client";

import { useState } from "react";
import { getSiteUrl } from "@/lib/engagement";

export function ShareTodaysPicks() {
  const [copied, setCopied] = useState(false);

  const shareTitle = "Today's top discoveries on Surfaced";
  const shareUrl = getSiteUrl();
  const shareText = `${shareTitle} \u{1F52D}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // user cancelled or not supported — fall through
      }
    }
    // Fallback: open X/Twitter
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener"
    );
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`Check out today's top discoveries on Surfaced:\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        data-share-action="daily-edition"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>
      <button
        onClick={handleEmail}
        data-share-action="email"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        Email
      </button>
      <button
        onClick={handleCopy}
        data-share-action="copy"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all cursor-pointer"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
