export interface SurfacedScoreState {
  version: 1;
  score: number;
  streak: number;
  lastCompletedDate: string | null;
  completed: Record<string, { storyId: string; correct: boolean; completedAt: string }>;
}

export const SURFACED_SCORE_STORAGE_KEY = "surfaced-score-v1";
const EMPTY_SURFACED_SCORE_STATE: SurfacedScoreState = {
  version: 1,
  score: 0,
  streak: 0,
  lastCompletedDate: null,
  completed: {},
};

export function blankSurfacedScoreState(): SurfacedScoreState {
  return EMPTY_SURFACED_SCORE_STATE;
}

export function parseSurfacedScoreState(value: string | null): SurfacedScoreState {
  try {
    const parsed = JSON.parse(value || "");
    if (parsed?.version === 1 && typeof parsed.completed === "object") return parsed;
  } catch {
    return blankSurfacedScoreState();
  }
  return blankSurfacedScoreState();
}

export function readSurfacedScoreState(): SurfacedScoreState {
  if (typeof window === "undefined") return blankSurfacedScoreState();
  return parseSurfacedScoreState(window.localStorage.getItem(SURFACED_SCORE_STORAGE_KEY));
}

export function surfacedScoreCompletionKey(dateKey: string, storyId: string): string {
  return `${dateKey}:${storyId}`;
}

export function dateDeltaDays(a: string | null, b: string): number {
  if (!a) return 999;
  const previous = new Date(`${a}T00:00:00.000Z`).getTime();
  const next = new Date(`${b}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return 999;
  return Math.round((next - previous) / 86_400_000);
}
