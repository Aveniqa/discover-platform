"use client";

interface LogoImageProps {
  domain: string;
  alt?: string;
  className?: string;
}

export function LogoImage({ domain, alt = "", className = "w-5 h-5 rounded-sm object-contain shrink-0" }: LogoImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://api.companyenrich.com/logo/${domain}`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
