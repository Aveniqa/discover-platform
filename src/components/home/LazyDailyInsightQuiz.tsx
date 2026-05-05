"use client";

import dynamic from "next/dynamic";
import type { DailyInsightQuizData } from "@/components/home/DailyInsightQuiz";

const DailyInsightQuiz = dynamic(() => import("@/components/home/DailyInsightQuiz"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.03] p-5">
      <div className="h-3 w-28 rounded-full bg-white/10" />
      <div className="mt-4 h-4 w-3/4 rounded-full bg-white/10" />
      <div className="mt-4 grid gap-2">
        <div className="h-9 rounded-lg bg-white/[0.06]" />
        <div className="h-9 rounded-lg bg-white/[0.06]" />
        <div className="h-9 rounded-lg bg-white/[0.06]" />
      </div>
    </div>
  ),
});

export function LazyDailyInsightQuiz({ quiz }: { quiz: DailyInsightQuizData }) {
  return <DailyInsightQuiz quiz={quiz} />;
}
