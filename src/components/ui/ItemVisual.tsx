"use client";

import { useState } from "react";
import { getItemImageUrl } from "@/lib/images";

interface ItemVisualProps {
  slug: string;
  alt: string;
  /** Local screenshot path (/screenshots/<slug>.webp) when the item has one */
  screenshotUrl?: string | null;
  /** The item's outbound URL — used to show its real logo when no screenshot exists */
  websiteLink?: string | null;
  aspectRatio?: string;
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md" | "lg" | "og";
  priority?: boolean;
  sizes?: string;
}

function hostOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The one visual component for catalog items. Resolution order:
 *
 *   1. Self-hosted website screenshot (public/screenshots/<slug>.webp) —
 *      the real thing, captured by scripts/capture-screenshots.mjs
 *   2. The tool's own logo on a tinted card — for the ~75 sites that block
 *      headless capture (Cloudflare walls, hard timeouts). A stock photo of
 *      a desk is not what the product looks like, so showing the real mark
 *      is the honest option; the cached editorial photo is only a backstop
 *      when even the logo won't load.
 *   3. Cached editorial photo (Pexels/Unsplash via image-cache.json)
 *   4. Palette gradient placeholder (pure CSS, no request)
 *
 * Each layer falls through on load error, so a deleted file or expired CDN
 * URL degrades gracefully instead of showing a broken image.
 */
export function ItemVisual({
  slug,
  alt,
  screenshotUrl,
  websiteLink,
  aspectRatio = "16/10",
  className = "",
  imgClassName = "",
  size = "md",
  priority = false,
  sizes,
}: ItemVisualProps) {
  const photoUrl = getItemImageUrl(slug, 600, 400, size);
  const host = hostOf(websiteLink);
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const useScreenshot = !!screenshotUrl && !screenshotFailed;
  const useLogo = !useScreenshot && !!host && !logoFailed;
  const usePhoto = !useScreenshot && !useLogo && !!photoUrl && !photoFailed;

  const defaultSizes =
    sizes ||
    (size === "lg"
      ? "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 940px"
      : "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 400px");

  return (
    <div className={`relative overflow-hidden bg-white/[0.03] ${className}`} style={{ aspectRatio }}>
      {useScreenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshotUrl!}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          sizes={defaultSizes}
          onError={() => setScreenshotFailed(true)}
          className={`w-full h-full object-cover object-top ${imgClassName}`}
        />
      ) : useLogo ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_50%_35%,rgba(229,178,93,0.16),transparent_65%)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${host}&sz=128`}
            alt={alt}
            width={56}
            height={56}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={() => setLogoFailed(true)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
          />
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/55 select-none">
            {host}
          </span>
        </div>
      ) : usePhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          sizes={defaultSizes}
          onError={() => setPhotoFailed(true)}
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-transparent to-cyan-500/15 flex items-center justify-center"
          style={{ aspectRatio }}
        >
          <span className="text-xs text-white/50 uppercase tracking-widest font-medium select-none">
            Surfaced
          </span>
        </div>
      )}
    </div>
  );
}
