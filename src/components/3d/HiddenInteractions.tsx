"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The collection of curiosity-rewards baked into the site. Each one is a
 * progressive enhancement — none is required for accessibility, none breaks
 * the page if disabled. The hint overlay also serves as keyboard-shortcut
 * documentation for screen-reader users via aria-live.
 *
 * Gestures:
 *  - Konami code (↑↑↓↓←→←→BA) → opens a random tool page
 *  - "g" "g" → opens the search modal
 *  - Hold "shift" + scroll → momentary hue tint on the whole site
 *  - Long-press (1.2s anywhere) → "depth mode" — extra blur + scale on cards
 *  - Triple-click empty area → re-rolls the global world seed
 *  - Shift + R → re-seed the world
 *  - "?" → flashes the keyboard hint
 *  - First time the konami code is triggered, a hidden "discovered" toast
 *    persists in localStorage so the user can come back for it later.
 */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function HiddenInteractions() {
  const [overlay, setOverlay] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const longPressRef = useRef<number | null>(null);
  const clickCount = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  // Restore discovered set
  useEffect(() => {
    try {
      const stored = localStorage.getItem("surfaced.discovered");
      if (stored) setDiscovered(JSON.parse(stored));
    } catch {}
  }, []);

  function markDiscovered(name: string) {
    setDiscovered((d) => {
      if (d.includes(name)) return d;
      const next = [...d, name];
      try {
        localStorage.setItem("surfaced.discovered", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function flash(msg: string, durationMs = 1600) {
    setOverlay(msg);
    setTimeout(() => setOverlay(null), durationMs);
  }

  function reseed() {
    window.dispatchEvent(new Event("surfaced:world-reseed"));
    flash("✦ World re-seeded");
  }

  function surprise() {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='/item/']"));
    if (links.length === 0) {
      window.location.href = "/tools";
      return;
    }
    const pick = links[Math.floor(Math.random() * links.length)];
    flash("☄ Surfacing something new...");
    markDiscovered("konami");
    setTimeout(() => { window.location.href = pick.href; }, 350);
  }

  // Keyboard handlers
  useEffect(() => {
    let buf: string[] = [];
    let lastKey = "";
    let lastTime = 0;

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      buf.push(e.key);
      if (buf.length > KONAMI.length) buf = buf.slice(-KONAMI.length);
      if (buf.length === KONAMI.length && buf.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        buf = [];
        surprise();
        return;
      }

      const now = Date.now();
      if (e.key === "g" && lastKey === "g" && now - lastTime < 500) {
        window.dispatchEvent(new CustomEvent("surfaced:open-search"));
        flash("⌕ Search");
        markDiscovered("gg-search");
        lastKey = "";
        return;
      }

      // Shift + R → reseed world
      if (e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        reseed();
        markDiscovered("reseed");
        return;
      }

      if (e.key === "?" && e.shiftKey) {
        flash(
          "Try: gg → search · ↑↑↓↓←→←→BA → surprise · shift+R → re-seed · long-press → depth mode · triple-click → wild card",
          3800
        );
      }

      lastKey = e.key;
      lastTime = now;
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Shift + scroll → momentary hue rotation
  useEffect(() => {
    let cleanup = false;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      if (cleanup) return;
      document.documentElement.style.setProperty("filter", "hue-rotate(40deg) saturate(1.2)");
      cleanup = true;
      markDiscovered("hue-tint");
      setTimeout(() => {
        document.documentElement.style.removeProperty("filter");
        cleanup = false;
      }, 1200);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // Long-press → depth mode
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // Ignore long-press on interactive elements (they have their own intent)
      const t = e.target as HTMLElement | null;
      if (t && t.closest("a, button, input, textarea, [role='button']")) return;
      longPressRef.current = window.setTimeout(() => {
        document.body.classList.add("depth-mode");
        flash("∞ Depth mode");
        markDiscovered("depth-mode");
      }, 1200);
    };
    const onPointerUpOrLeave = () => {
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
      if (document.body.classList.contains("depth-mode")) {
        setTimeout(() => document.body.classList.remove("depth-mode"), 800);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUpOrLeave);
    window.addEventListener("pointercancel", onPointerUpOrLeave);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUpOrLeave);
      window.removeEventListener("pointercancel", onPointerUpOrLeave);
    };
  }, []);

  // Triple-click empty area → wild-card spin
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("a, button, input, textarea, [role='button']")) {
        clickCount.current = { count: 0, lastAt: 0 };
        return;
      }
      const now = Date.now();
      if (now - clickCount.current.lastAt < 500) {
        clickCount.current.count += 1;
      } else {
        clickCount.current.count = 1;
      }
      clickCount.current.lastAt = now;
      if (clickCount.current.count >= 3) {
        clickCount.current = { count: 0, lastAt: 0 };
        reseed();
        markDiscovered("triple-click");
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      {overlay && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full bg-black/85 text-white text-sm backdrop-blur-md border border-white/15 shadow-2xl"
          style={{ animation: "fade-in 0.25s ease-out" }}
        >
          {overlay}
        </div>
      )}
      {/* Discovery badge — tiny indicator at bottom-left of how many secrets they've found */}
      {discovered.length > 0 && (
        <div
          className="fixed bottom-6 left-6 z-[60] px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10px] uppercase tracking-[0.18em] text-white/70"
          title={`Discovered: ${discovered.join(", ")}\nPress Shift + ? for hints`}
        >
          {discovered.length} secret{discovered.length === 1 ? "" : "s"} found
        </div>
      )}
    </>
  );
}
