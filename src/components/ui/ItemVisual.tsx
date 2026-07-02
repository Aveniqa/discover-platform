"use client";

import { useState } from "react";
import { getItemImageUrl } from "@/lib/images";

interface ItemVisualProps {
  slug: string;
  alt: string;
  /** Local screenshot path (/screenshots/<slug>.webp) when the item has one */
  screenshotUrl?: string | null;
  aspectRatio?: string;
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md" | "lg" | "og";
  priority?: boolean;
  sizes?: string;
}

/**
 * The one visual component for catalog items. Resolution order:
 *
 *   1. Self-hosted website screenshot (public/screenshots/<slug>.webp) —
 *      the real thing, captured by scripts/capture-screenshots.mjs
 *   2. Cached editorial photo (Pexels/Unsplash via image-cache.json)
 *   3. Palette gradient placeholder (pure CSS, no request)
 *
 * Each layer falls through on load error, so a deleted file or expired CDN
 * URL degrades gracefully instead of showing a broken image.
 */
export function ItemVisual({
  slug,
  alt,
  screenshotUrl,
  aspectRatio = "16/10",
  className = "",
  imgClassName = "",
  size = "md",
  priority = false,
  sizes,
}: ItemVisualProps) {
  const photoUrl = getItemImageUrl(slug, 600, 400, size);
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const useScreenshot = !!screenshotUrl && !screenshotFailed;
  const usePhoto = !useScreenshot && !!photoUrl && !photoFailed;

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
