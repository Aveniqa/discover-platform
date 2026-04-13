import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="relative mb-8">
        <span className="text-8xl sm:text-9xl font-extrabold gradient-text select-none">
          404
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
        Page not found
      </h1>
      <p className="text-muted text-base sm:text-lg max-w-md mb-8 leading-relaxed">
        This page doesn&apos;t exist or may have been moved. Let&apos;s get you
        back to discovering.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gradient text-sm"
        >
          Back to Home
          <span>&rarr;</span>
        </Link>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all"
        >
          Browse Discoveries
        </Link>
      </div>
    </main>
  );
}
