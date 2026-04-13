"use client";

export function AdSlot({ slot, format = "auto" }: { slot: string; format?: string }) {
  // Only render if AdSense publisher ID is configured
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  if (!pubId) return null;

  return (
    <div className="my-8 flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={pubId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
