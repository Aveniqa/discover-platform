"use client";

import { useEffect, useState } from "react";

/**
 * Curious-user rewards:
 *   - Konami code (↑↑↓↓←→←→BA) → cycles to a random tool slug
 *   - "g" "g" double-press → opens the search modal
 *   - Hold "shift" + scroll → switches color theme momentarily
 *   - Hold "?" → flashes a hint overlay with keyboard shortcuts
 *
 * All are progressive enhancements. None block accessibility or get in the way
 * of regular interaction. The hint overlay also acts as keyboard-shortcut docs
 * for screen readers via aria-live when triggered.
 */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function HiddenInteractions() {
  const [overlay, setOverlay] = useState<string | null>(null);

  useEffect(() => {
    let buf: string[] = [];
    let lastKey = "";
    let lastTime = 0;

    const surprise = () => {
      // Pull from the runtime search index if it's been hydrated; otherwise fall
      // back to a known route so the user still gets something
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='/item/']"));
      if (links.length === 0) {
        window.location.href = "/tools";
        return;
      }
      const pick = links[Math.floor(Math.random() * links.length)];
      flash("☄ Surfacing something new...");
      setTimeout(() => { window.location.href = pick.href; }, 350);
    };

    const flash = (msg: string) => {
      setOverlay(msg);
      setTimeout(() => setOverlay(null), 1400);
    };

    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      // Konami
      buf.push(e.key);
      if (buf.length > KONAMI.length) buf = buf.slice(-KONAMI.length);
      if (buf.length === KONAMI.length && buf.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        buf = [];
        surprise();
        return;
      }

      // gg shortcut
      const now = Date.now();
      if (e.key === "g" && lastKey === "g" && now - lastTime < 500) {
        const evt = new CustomEvent("surfaced:open-search");
        window.dispatchEvent(evt);
        flash("⌕ Search");
        lastKey = "";
        return;
      }

      // ? hint
      if (e.key === "?" && e.shiftKey) {
        flash("Try: gg → search · ↑↑↓↓←→←→BA → surprise me · shift+scroll → secret tint");
      }

      lastKey = e.key;
      lastTime = now;
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cleanup = false;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      if (cleanup) return;
      document.documentElement.style.setProperty("filter", "hue-rotate(40deg) saturate(1.2)");
      cleanup = true;
      setTimeout(() => {
        document.documentElement.style.removeProperty("filter");
        cleanup = false;
      }, 1200);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  if (!overlay) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full bg-black/85 text-white text-sm backdrop-blur-md border border-white/15 shadow-2xl animate-fade-in"
    >
      {overlay}
    </div>
  );
}
