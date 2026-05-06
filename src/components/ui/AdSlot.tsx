"use client";

import { useEffect, useRef } from "react";

const PUB_ID = "ca-pub-8054019783472830";

interface AdSlotProps {
  /** Ad unit slot ID from Google AdSense dashboard (Ads → By ad unit → copy data-ad-slot value) */
  slot: string;
  /** AdSense format. "auto" works for most placements. */
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  /** Optional label for the ad region (used by AdSense for analytics) */
  label?: string;
  className?: string;
  /** Reserved height in px once a real ad slot exists, reducing ad-load layout shift. */
  minHeight?: number;
}

function getDefaultMinHeight(format: NonNullable<AdSlotProps["format"]>): number {
  switch (format) {
    case "horizontal":
      return 96;
    case "rectangle":
      return 280;
    case "vertical":
      return 320;
    case "fluid":
      return 180;
    default:
      return 120;
  }
}

/**
 * AdSlot — renders a Google AdSense manual ad unit.
 *
 * How to get a slot ID:
 *  1. Go to AdSense → Ads → By ad unit → Create new ad unit
 *  2. Choose "Display ads" → give it a name → Create
 *  3. Copy the numeric value from data-ad-slot="XXXXXXXXXX"
 *  4. Pass it as the `slot` prop here
 *
 * Renders nothing if `slot` is empty — safe to deploy before units are created.
 * Auto Ads (enabled in the AdSense dashboard) work independently of this component.
 */
export function AdSlot({ slot, format = "auto", label, className = "", minHeight }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const hasSlot = !!slot && slot.length >= 6;
  const reservedHeight = minHeight ?? getDefaultMinHeight(format);

  useEffect(() => {
    if (!hasSlot || pushed.current || !insRef.current) return;
    pushed.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense blocked (ad blocker, preview env, etc.) — fail silently
    }
  }, [hasSlot]);

  // Render nothing until a real slot ID is provided — safe placeholder
  if (!hasSlot) return null;

  return (
    <div
      className={`adsense-slot my-6 overflow-hidden ${className}`}
      role="complementary"
      aria-label="Advertisement"
      style={{ minHeight: reservedHeight }}
    >
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Advertisement
      </p>
      <ins
        ref={insRef}
        className="adsbygoogle mx-auto"
        style={{
          display: "block",
          minHeight: Math.max(1, reservedHeight - 24),
          minWidth: "250px",
          width: "100%",
        }}
        data-ad-client={PUB_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        data-ad-region={label}
      />
    </div>
  );
}
