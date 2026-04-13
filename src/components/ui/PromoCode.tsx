"use client";

import { useState } from "react";

export function PromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-4 inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-elevated border border-border/60">
      <span className="text-xs text-muted-foreground">Use code</span>
      <button
        onClick={handleCopy}
        className="font-mono font-bold text-sm text-foreground tracking-wider cursor-pointer hover:text-accent transition-colors"
        title="Click to copy"
      >
        {copied ? "Copied!" : code}
      </button>
      <span className="text-xs text-muted-foreground">at checkout</span>
    </div>
  );
}
