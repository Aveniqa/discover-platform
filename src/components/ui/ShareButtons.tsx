"use client";

import { useState } from "react";
import { getShareUrl, getShareText, copyToClipboard } from "@/lib/engagement";

interface ShareButtonsProps {
  title: string;
  slug: string;
  compact?: boolean;
}

const btnBase =
  "w-9 h-9 flex items-center justify-center rounded-full border border-border text-sm hover:bg-accent/10 hover:border-accent transition-colors shrink-0";

export function ShareButtons({ title, slug, compact }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [socialCopied, setSocialCopied] = useState(false);

  const itemUrl = getShareUrl(slug);
  const shareText = getShareText(title);

  const handleCopyLink = async () => {
    await copyToClipboard(itemUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyForSocial = async () => {
    const text = `${title}\n\n${shareText}\n\nDiscover more at ${itemUrl}`;
    await copyToClipboard(text);
    setSocialCopied(true);
    setTimeout(() => setSocialCopied(false), 2500);
  };

  const shareLinks = [
    {
      name: "X (Twitter)",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(itemUrl)}`,
    },
    {
      name: "Facebook",
      icon: <span className="font-bold text-[13px]">f</span>,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(itemUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: <span className="font-bold text-[11px]">in</span>,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(itemUrl)}`,
    },
    {
      name: "Reddit",
      icon: <span className="font-bold text-[13px]">r/</span>,
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(itemUrl)}&title=${encodeURIComponent(title)}`,
    },
    {
      name: "WhatsApp",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      url: `https://wa.me/?text=${encodeURIComponent(title + " " + itemUrl)}`,
    },
    {
      name: "Telegram",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodeURIComponent(itemUrl)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: "Email",
      icon: <span className="text-sm">✉</span>,
      url: `mailto:?subject=${encodeURIComponent(title + " — Surfaced")}&body=${encodeURIComponent("Check this out: " + itemUrl)}`,
    },
  ];

  if (compact) {
    // Compact version: Twitter, WhatsApp, Copy Link
    const compactBtnClass =
      "w-8 h-8 rounded-lg flex items-center justify-center bg-surface-elevated/80 border border-border text-muted-foreground hover:text-foreground hover:border-accent/25 hover:bg-surface-hover transition-all text-xs";
    return (
      <div className="flex items-center gap-2">
        <a href={shareLinks[0].url} target="_blank" rel="noopener noreferrer" className={compactBtnClass} aria-label="Share on X" title="Share on X">
          {shareLinks[0].icon}
        </a>
        <a href={shareLinks[4].url} target="_blank" rel="noopener noreferrer" className={compactBtnClass} aria-label="Share on WhatsApp" title="Share on WhatsApp">
          {shareLinks[4].icon}
        </a>
        <button onClick={handleCopyLink} className={compactBtnClass} aria-label="Copy link" title="Copy link">
          {copied ? (
            <span className="text-emerald-400 text-xs">✓</span>
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target={link.url.startsWith("mailto") ? undefined : "_blank"}
          rel={link.url.startsWith("mailto") ? undefined : "noopener noreferrer"}
          title={`Share on ${link.name}`}
          aria-label={`Share on ${link.name}`}
          className={btnBase}
          data-share-action={link.name.toLowerCase()}
          data-share-slug={slug}
        >
          {link.icon}
        </a>
      ))}

      {/* Copy for Instagram/TikTok */}
      <button
        onClick={handleCopyForSocial}
        title="Copy for Instagram/TikTok"
        aria-label="Copy for Instagram/TikTok"
        className={btnBase}
        data-share-action="social-copy"
        data-share-slug={slug}
      >
        {socialCopied ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-sm">📱</span>}
      </button>

      {/* Copy link */}
      <button
        onClick={handleCopyLink}
        title="Copy link"
        aria-label="Copy link"
        className={btnBase}
        data-share-action="copy"
        data-share-slug={slug}
      >
        {copied ? (
          <span className="text-emerald-400 text-xs">✓</span>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
    </div>
  );
}
