"use client";

import { useMemo, useState } from "react";

export interface DailyInsightQuizData {
  storyId: string;
  dateKey: string;
  title: string;
  question: string;
  options: string[];
  answerIndex: number;
  explainer: string;
  sourceName: string;
  sourceUrl: string;
}

interface SurfacedScoreState {
  version: 1;
  score: number;
  streak: number;
  lastCompletedDate: string | null;
  completed: Record<string, { storyId: string; correct: boolean; completedAt: string }>;
}

const STORAGE_KEY = "surfaced-score-v1";

function blankState(): SurfacedScoreState {
  return { version: 1, score: 0, streak: 0, lastCompletedDate: null, completed: {} };
}

function readScoreState(): SurfacedScoreState {
  if (typeof window === "undefined") return blankState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "");
    if (parsed?.version === 1 && typeof parsed.completed === "object") return parsed;
  } catch {
    return blankState();
  }
  return blankState();
}

function dateDeltaDays(a: string | null, b: string): number {
  if (!a) return 999;
  const previous = new Date(`${a}T00:00:00.000Z`).getTime();
  const next = new Date(`${b}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return 999;
  return Math.round((next - previous) / 86_400_000);
}

export default function DailyInsightQuiz({ quiz }: { quiz: DailyInsightQuizData }) {
  const [scoreState, setScoreState] = useState<SurfacedScoreState>(() => readScoreState());
  const [selected, setSelected] = useState<number | null>(null);
  const completeKey = `${quiz.dateKey}:${quiz.storyId}`;
  const completed = scoreState.completed[completeKey];

  const statusText = useMemo(() => {
    if (!completed) return `${scoreState.score} points / ${scoreState.streak} day streak`;
    return completed.correct ? "Correct insight logged" : "Insight logged";
  }, [completed, scoreState.score, scoreState.streak]);

  function answer(index: number) {
    if (completed) return;
    const correct = index === quiz.answerIndex;
    const today = quiz.dateKey;
    const delta = dateDeltaDays(scoreState.lastCompletedDate, today);
    const nextStreak = delta === 1 ? scoreState.streak + 1 : delta === 0 ? scoreState.streak : 1;
    const nextState: SurfacedScoreState = {
      version: 1,
      score: scoreState.score + (correct ? 10 : 3),
      streak: nextStreak,
      lastCompletedDate: today,
      completed: {
        ...scoreState.completed,
        [completeKey]: {
          storyId: quiz.storyId,
          correct,
          completedAt: new Date().toISOString(),
        },
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    setSelected(index);
    setScoreState(nextState);
  }

  return (
    <aside className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
            Surfaced Score
          </p>
          <h4 className="mt-1 text-base font-black tracking-tight text-foreground">
            Daily Insight
          </h4>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-background/35 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {statusText}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-snug text-foreground">
        {quiz.question}
      </p>
      <div className="mt-4 grid gap-2">
        {quiz.options.map((option, index) => {
          const answered = Boolean(completed);
          const isCorrect = index === quiz.answerIndex;
          const isSelected = selected === index;
          const stateClass = answered && isCorrect
            ? "border-emerald-300/55 bg-emerald-300/10 text-emerald-100"
            : answered && isSelected
              ? "border-rose-300/45 bg-rose-300/10 text-rose-100"
              : "border-border/70 bg-background/35 text-muted hover:border-cyan-300/35 hover:text-foreground";
          return (
            <button
              key={option}
              type="button"
              onClick={() => answer(index)}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold leading-snug transition-colors ${stateClass}`}
              disabled={answered}
            >
              {option}
            </button>
          );
        })}
      </div>

      {completed && (
        <div className="mt-4 border-t border-border/50 pt-3">
          <p className="text-xs leading-relaxed text-muted">
            {quiz.explainer}
          </p>
          <a
            href={quiz.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-[11px] font-medium text-muted-foreground hover:text-cyan-200 transition-colors link-underline"
          >
            Source: {quiz.sourceName}
          </a>
        </div>
      )}
    </aside>
  );
}
