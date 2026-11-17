import type { Exercise, ExerciseKind, MeasureType, PlanDay, Workout, WorkoutExercise } from '../types';
import { findLastPerformance, suggest } from './progression';
import { uid } from './uid';

export function defaultRange(kind: ExerciseKind, measure: MeasureType) {
  if (measure === 'time') return { repMin: 20, repMax: 40 };
  return kind === 'compound' ? { repMin: 6, repMax: 10 } : { repMin: 10, repMax: 15 };
}

export function makeWorkoutExercise(
  ex: Exercise,
  item: { sets: number; repMin: number; repMax: number; restSec?: number | null },
  history: Workout[],
  occurrence: number,
): WorkoutExercise {
  const last = findLastPerformance(history, ex.id, occurrence);
  const sug = suggest(ex, item, last?.sets);
  return {
    uid: uid(),
    exerciseId: ex.id,
    plannedSets: item.sets,
    repMin: item.repMin,
    repMax: item.repMax,
    restSec: item.restSec ?? null,
    sets: sug.targets.map((t) => ({ id: uid(), weight: sug.weight, reps: t, done: false, warmup: false })),
  };
}

export function buildWorkout(day: PlanDay, exMap: Map<string, Exercise>, history: Workout[]): Workout {
  const occ = new Map<string, number>();
  const exercises: WorkoutExercise[] = [];
  for (const item of day.items) {
    const ex = exMap.get(item.exerciseId);
    if (!ex) continue;
    const o = occ.get(ex.id) ?? 0;
    occ.set(ex.id, o + 1);
    exercises.push(makeWorkoutExercise(ex, item, history, o));
  }
  return { id: uid(), dayId: day.id, dayName: day.name, dayColor: day.color, startedAt: Date.now(), note: '', exercises };
}

/** Nächster Tag in der Rotation (nach dem zuletzt trainierten Tag), außer manuell gewählt. */
export function nextDay(days: PlanDay[], workouts: Workout[], overrideId?: string | null): PlanDay | undefined {
  const sorted = [...days].sort((a, b) => a.order - b.order);
  if (!sorted.length) return undefined;
  if (overrideId) {
    const d = sorted.find((x) => x.id === overrideId);
    if (d) return d;
  }
  return rotationNext(sorted, workouts);
}

export function rotationNext(sorted: PlanDay[], workouts: Workout[]): PlanDay | undefined {
  let last: Workout | undefined;
  for (const w of workouts) if (!last || w.startedAt > last.startedAt) last = w;
  if (!last) return sorted[0];
  const i = sorted.findIndex((d) => d.id === last!.dayId);
  return i < 0 ? sorted[0] : sorted[(i + 1) % sorted.length];
}
