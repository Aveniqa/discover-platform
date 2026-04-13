"use client";

import { useState } from "react";
import { getShareUrl, getShareText, copyToClipboard } from "@/lib/engagement";

interface ShareButtonsProps {
  title: string;
  slug: string;
  compact?: boolean;
}

/* Inline SVG icons — reliable across all browsers */
function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function ShareButtons({ title, slug, compact }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = getShareUrl(slug);
  const text = getShareText(title);

  const handleCopy = async () => {
    await copyToClipboard(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;

  const btnClass = compact
    ? "w-8 h-8 rounded-lg flex items-center justify-center bg-surface-elevated/80 border border-border text-muted-foreground hover:text-foreground hover:border-accent/25 hover:bg-surface-hover transition-all text-xs"
    : "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated/80 border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/25 hover:bg-surface-hover transition-all";

  return (
    <div className="flex items-center gap-2">
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="Share on X" data-share-action="twitter" data-share-slug={slug}>
        {compact ? <XIcon className="w-3 h-3" /> : <><XIcon /><span>Tweet</span></>}
      </a>
      <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="Share on Facebook" data-share-action="facebook" data-share-slug={slug}>
        {compact ? "f" : <><span>f</span><span>Share</span></>}
      </a>
      <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="Share on LinkedIn" data-share-action="linkedin" data-share-slug={slug}>
        {compact ? "in" : <><span>in</span><span>LinkedIn</span></>}
      </a>
      <button onClick={handleCopy} className={btnClass} aria-label="Copy link" data-share-action="copy" data-share-slug={slug}>
        {copied
          ? (compact ? <span className="text-emerald">&#10003;</span> : "Copied!")
          : compact ? <LinkIcon className="w-3 h-3" /> : <><LinkIcon /><span>Copy Link</span></>
        }
      </button>
    </div>
  );
}
