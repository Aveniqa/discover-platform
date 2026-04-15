"use client";

import { useState } from "react";
import { getItemImageUrl } from "@/lib/images";

interface ItemImageProps {
  slug: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "og";
  priority?: boolean;
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
}: ItemImageProps) {
  const imageUrl = getItemImageUrl(slug, width, height, size);
  const [errored, setErrored] = useState(false);

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
