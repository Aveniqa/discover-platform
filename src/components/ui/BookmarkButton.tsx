"use client";

import { useState, useEffect } from "react";
import { isBookmarked, toggleBookmark } from "@/lib/engagement";
import { track } from "@/lib/analytics";

export function BookmarkButton({ slug, size = "sm" }: { slug: string; size?: "sm" | "md" }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(slug));
  }, [slug]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleBookmark(slug);
    setSaved(nowSaved);
    track("bookmark_toggle", { slug, action: nowSaved ? "add" : "remove" });
    // Dispatch event for header count update
    window.dispatchEvent(new CustomEvent("bookmarkChange"));
  };

  const sizes = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  return (
    <button
      onClick={handleClick}
      className={`${sizes} rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
        saved
          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(251,113,133,0.12)]"
          : "bg-surface-elevated/60 text-muted-foreground border border-border hover:text-rose-400 hover:border-rose-500/25"
      }`}
      aria-label={saved ? "Remove bookmark" : "Bookmark"}
      title={saved ? "Remove bookmark" : "Save for later"}
    >
      <svg width={size === "sm" ? 14 : 18} height={size === "sm" ? 14 : 18} viewBox="0 0 16 16" fill={saved ? "currentColor" : "none"}>
        <path
          d="M8 3.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L8 9.8 5.4 11.4l.5-2.9-2.1-2 2.9-.4L8 3.5z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
