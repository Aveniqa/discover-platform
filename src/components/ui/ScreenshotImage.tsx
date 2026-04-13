"use client";

interface ScreenshotImageProps {
  src: string;
  alt: string;
}

export function ScreenshotImage({ src, alt }: ScreenshotImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full object-cover"
      style={{ aspectRatio: "16/7", objectPosition: "top" }}
      loading="eager"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
