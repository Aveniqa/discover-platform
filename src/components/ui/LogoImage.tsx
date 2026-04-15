"use client";

import { useState } from "react";

interface LogoImageProps {
  domain: string;
  alt?: string;
  className?: string;
}

/**
 * Displays a domain logo with automatic fallback chain:
 * 1. Google Favicons (reliable, fast CDN)
 * 2. Hidden on failure
 *
 * Previously used api.companyenrich.com which returns broken/empty
 * responses for many domains.
 */
export function LogoImage({ domain, alt = "", className = "w-5 h-5 rounded-sm object-contain shrink-0" }: LogoImageProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHidden(true)}
    />
  );
}
