"use client";

import { useState } from "react";

interface ScreenshotImageProps {
  src: string;
  alt: string;
  fallbackSlug?: string;
}

export function ScreenshotImage({ src, alt, fallbackSlug }: ScreenshotImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    // Fallback: show a simple gradient placeholder instead of the broken external screenshot
    return (
      <div
        className="w-full bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center"
        style={{ aspectRatio: "16/7" }}
      >
        <span className="text-xs text-white/60 uppercase tracking-wider">Surfaced</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full object-cover"
      style={{ aspectRatio: "16/7", objectPosition: "top" }}
      loading="eager"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
    />
  );
}
