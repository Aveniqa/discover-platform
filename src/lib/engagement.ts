"use client";

/* ---- Bookmark System ---- */
const BOOKMARKS_KEY = "surfaced_bookmarks";

export function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleBookmark(slug: string): boolean {
  const bookmarks = getBookmarks();
  const idx = bookmarks.indexOf(slug);
  if (idx > -1) {
    bookmarks.splice(idx, 1);
  } else {
    bookmarks.push(slug);
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  return idx === -1; // returns true if added
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}

/* ---- Streak System ---- */
const STREAK_KEY = "surfaced_streak";
const LAST_VISIT_KEY = "surfaced_last_visit";

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

export function updateStreak(): number {
  if (typeof window === "undefined") return 1;
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  let streak = parseInt(localStorage.getItem(STREAK_KEY) || "0");

  if (lastVisit === today) {
    // same day
  } else if (lastVisit === getYesterday(today)) {
    streak += 1;
  } else {
    streak = 1;
  }
  localStorage.setItem(LAST_VISIT_KEY, today);
  localStorage.setItem(STREAK_KEY, streak.toString());
  return streak;
}

export function getStreak(): number {
  if (typeof window === "undefined") return 1;
  return parseInt(localStorage.getItem(STREAK_KEY) || "1");
}

/* ---- Newsletter (localStorage) ---- */
const NEWSLETTER_KEY = "surfaced_newsletter_email";

export function saveNewsletterEmail(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NEWSLETTER_KEY, email);
}

export function getNewsletterEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NEWSLETTER_KEY);
}

/* ---- Share ---- */
const SITE_URL = "https://surfaced-x.pages.dev";

export function getShareUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  return `${origin}/item/${slug}`;
}

export function getSiteUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : SITE_URL;
}

export function getShareText(title: string): string {
  return `Just discovered "${title}" on Surfaced`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
