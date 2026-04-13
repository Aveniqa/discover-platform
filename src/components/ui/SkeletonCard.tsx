export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 bg-surface h-full">
      <div className="aspect-[3/2] bg-white/[0.03] animate-pulse">
        <div className="w-full h-full bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02]" />
      </div>
      <div className="p-6 space-y-3">
        <div className="h-4 w-20 bg-white/[0.06] rounded-full" />
        <div className="h-5 w-3/4 bg-white/[0.06] rounded" />
        <div className="h-4 w-full bg-white/[0.06] rounded" />
        <div className="h-3 w-16 bg-white/[0.04] rounded mt-2" />
      </div>
    </div>
  );
}
