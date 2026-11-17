import type { Exercise, SetEntry, Workout } from '../types';
import { round2 } from './format';

export interface SetLike {
  weight: number;
  reps: number;
}
export interface LastPerformance {
  date: number;
  workoutId: string;
  sets: SetLike[];
}
export type SuggestionStatus = 'new' | 'increase' | 'reps';
export interface Suggestion {
  status: SuggestionStatus;
  /** vorgeschlagenes Gewicht (Zusatzgewicht bei Körpergewicht) */
  weight: number;
  /** Ziel-Wdh. (bzw. Sekunden) pro Arbeitssatz */
  targets: number[];
}

export const TIME_STEP = 5;

export const workingSets = (sets: SetEntry[]) => sets.filter((s) => s.done && !s.warmup);

/**
 * Letzte Ausführung einer Übung. `occurrence` = wievielte Ausführung derselben Übung im Workout
 * (z. B. „Bauch" zweimal am Beintag).
 */
export function findLastPerformance(
  workouts: Workout[],
  exerciseId: string,
  occurrence = 0,
  excludeId?: string,
): LastPerformance | undefined {
  let best: LastPerformance | undefined;
  for (const w of workouts) {
    if (w.id === excludeId || w.endedAt == null) continue;
    if (best && w.startedAt <= best.date) continue;
    const occ = w.exercises.filter((e) => e.exerciseId === exerciseId);
    if (!occ.length) continue;
    const ws = workingSets(occ[Math.min(occurrence, occ.length - 1)].sets);
    if (!ws.length) continue;
    best = { date: w.startedAt, workoutId: w.id, sets: ws.map((s) => ({ weight: s.weight, reps: s.reps })) };
  }
  return best;
}

/**
 * Double Progression:
 * - alle Sätze am oberen Ende → Gewicht + increment, Ziel = unteres Ende
 * - sonst gleiches Gewicht, Ziel = 1 Wdh. mehr pro Satz (max. oberes Ende)
 * Zeit-Übungen: gleiche Logik in 5-s-Schritten.
 */
export function suggest(
  ex: Pick<Exercise, 'measure' | 'increment'>,
  range: { sets: number; repMin: number; repMax: number },
  last?: SetLike[],
): Suggestion {
  const n = Math.max(1, range.sets);
  if (!last || last.length === 0) {
    return { status: 'new', weight: 0, targets: Array(n).fill(range.repMin) };
  }
  const at = (i: number) => last[Math.min(i, last.length - 1)];
  const allTop = last.length >= n && last.slice(0, n).every((s) => s.reps >= range.repMax);
  const top = Math.max(...last.map((s) => s.weight));

  if (ex.measure === 'time') {
    if (allTop) {
      return { status: 'increase', weight: top, targets: Array.from({ length: n }, (_, i) => at(i).reps + TIME_STEP) };
    }
    return {
      status: 'reps',
      weight: top,
      targets: Array.from({ length: n }, (_, i) => {
        const r = at(i).reps;
        return r >= range.repMax ? r : Math.min(r + TIME_STEP, range.repMax);
      }),
    };
  }

  if (allTop) {
    return { status: 'increase', weight: round2(top + ex.increment), targets: Array(n).fill(range.repMin) };
  }
  return {
    status: 'reps',
    weight: top,
    targets: Array.from({ length: n }, (_, i) => {
      if (i >= last.length) return range.repMin;
      return Math.min(last[i].reps + 1, range.repMax);
    }),
  };
}
