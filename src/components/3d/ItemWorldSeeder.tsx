"use client";

import { useEffect } from "react";

/**
 * Tells the GlobalWorld which item is being viewed so its seed picks up
 * the slug + category for a per-item unique scene. The GlobalWorld reads
 * data-item-slug / data-item-category from document.body.
 */
export function ItemWorldSeeder({ slug, category }: { slug: string; category: string }) {
  useEffect(() => {
    const prevSlug = document.body.dataset.itemSlug;
    const prevCat = document.body.dataset.itemCategory;
    document.body.dataset.itemSlug = slug;
    document.body.dataset.itemCategory = category;
    // Trigger a synthetic event the GlobalWorld can listen for if needed
    window.dispatchEvent(new Event("surfaced:world-reseed"));
    return () => {
      if (prevSlug) document.body.dataset.itemSlug = prevSlug;
      else delete document.body.dataset.itemSlug;
      if (prevCat) document.body.dataset.itemCategory = prevCat;
      else delete document.body.dataset.itemCategory;
    };
  }, [slug, category]);
  return null;
}
