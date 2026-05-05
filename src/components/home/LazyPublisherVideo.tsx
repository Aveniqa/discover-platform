"use client";

import { useState } from "react";

export function LazyPublisherVideo({
  videoId,
  title,
  channelTitle,
}: {
  videoId: string;
  title: string;
  channelTitle: string;
}) {
  const [active, setActive] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <aside className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Publisher video
        </p>
        <h4 className="mt-1 text-base font-black leading-snug tracking-tight text-foreground">
          {title}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Source: {channelTitle}
        </p>
      </div>
      <div className="relative aspect-video bg-background">
        {active ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            className="group absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-label={`Play ${title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-75 transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            />
            <span className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform duration-300 ease-out group-hover:scale-105">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="ml-0.5">
                <path d="M6.5 4.75v10.5L15 10 6.5 4.75Z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
        >
          Open on YouTube
        </a>
      </div>
    </aside>
  );
}
