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
  size?: "sm" | "md" | "lg";
}

export function ItemImage({
  slug,
  alt,
  width = 600,
  height = 400,
  aspectRatio = "16/10",
  className = "",
  size = "md",
}: ItemImageProps) {
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-white/[0.03] ${className}`}
      style={{ aspectRatio }}
    >
      {errored ? (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center">
          <span className="text-xs text-white/20 uppercase tracking-wider">Surfaced</span>
        </div>
      ) : (
        <img
          src={getItemImageUrl(slug, width, height, size)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
