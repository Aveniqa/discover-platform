"use client";

import { useState } from "react";
import { getItemImageUrl, getItemImageSrcSet } from "@/lib/images";

interface ItemImageProps {
  slug: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "og";
  priority?: boolean;
  /**
   * `sizes` attribute matching the layout. Defaults assume a 3-column-on-
   * desktop grid; override for hero/lead images.
   */
  sizes?: string;
}

/**
 * Gradient placeholder shown when no cached image exists
 * or when an image fails to load. Pure CSS — no external request.
 */
function ImagePlaceholder({ aspectRatio = "16/10" }: { aspectRatio?: string }) {
  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 flex items-center justify-center"
      style={{ aspectRatio }}
    >
      <span className="text-xs text-white/50 uppercase tracking-widest font-medium select-none">
        Surfaced
      </span>
    </div>
  );
}

export function ItemImage({
  slug,
  alt,
  width = 600,
  height = 400,
  aspectRatio = "16/10",
  className = "",
  size = "md",
  priority = false,
  sizes,
}: ItemImageProps) {
  const imageUrl = getItemImageUrl(slug, width, height, size);
  // Generate srcset variants only for non-OG sizes (OG is fixed 1200×630)
  const srcSet = size === "og" ? null : getItemImageSrcSet(slug);
  const [errored, setErrored] = useState(false);

  // Default `sizes` covers the most common layout: ~360px on mobile,
  // ~700px on tablet, ~940px on desktop. Caller can override for hero usage.
  const defaultSizes =
    sizes ||
    (size === "lg"
      ? "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 940px"
      : "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 400px");

  return (
    <div
      className={`relative overflow-hidden bg-white/[0.03] ${className}`}
      style={{ aspectRatio }}
    >
      {!imageUrl || errored ? (
        <ImagePlaceholder aspectRatio={aspectRatio} />
      ) : (
        <img
          src={imageUrl}
          {...(srcSet ? { srcSet: srcSet.srcSet, sizes: defaultSizes } : {})}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
