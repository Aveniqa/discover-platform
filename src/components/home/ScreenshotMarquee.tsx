"use client";

import Link from "next/link";

export interface MarqueeShot {
  slug: string;
  title: string;
  visual: string;
}

/**
 * ScreenshotMarquee — "the wall of the internet." Two counter-scrolling rows
 * of real site screenshots on a perspective-tilted plane. Rows pause on
 * hover; every card links to its item page. Pure CSS animation.
 */
export function ScreenshotMarquee({ items }: { items: MarqueeShot[] }) {
  if (items.length < 6) return null;
  const half = Math.ceil(items.length / 2);
  const rows: [MarqueeShot[], MarqueeShot[]] = [items.slice(0, half), items.slice(half)];

  return (
    <div className="shot-marquee-stage py-4" aria-label="Recently surfaced tools">
      <div className="shot-marquee-plane flex flex-col gap-4">
        {rows.map((row, r) => {
          const doubled = [...row, ...row];
          return (
            <div
              key={r}
              className="shot-marquee-row"
              style={{
                animation: `${r === 0 ? "shot-marquee-ltr" : "shot-marquee-rtl"} ${55 + r * 14}s linear infinite`,
              }}
            >
              {doubled.map((item, i) => (
                <Link
                  key={`${item.slug}-${i}`}
                  href={`/item/${item.slug}`}
                  className="shot-marquee-card group"
                  data-cursor="hover"
                  tabIndex={i < row.length ? 0 : -1}
                  aria-hidden={i >= row.length}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.visual}
                    alt={i < row.length ? item.title : ""}
                    width={240}
                    height={150}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[8/5] object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="absolute bottom-2 left-3 right-3 text-[11px] font-semibold text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.title}
                  </p>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
