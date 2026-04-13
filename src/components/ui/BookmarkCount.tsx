"use client";

import { useState, useEffect } from "react";
import { getBookmarks } from "@/lib/engagement";
import Link from "next/link";

export function BookmarkCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getBookmarks().length);
    update();
    window.addEventListener("bookmarkChange", update);
    return () => window.removeEventListener("bookmarkChange", update);
  }, []);

  return (
    <Link
      href="/saved"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
      title="Saved items"
    >
      <span>♡</span>
      {count > 0 && <span className="font-medium">{count}</span>}
    </Link>
  );
}
