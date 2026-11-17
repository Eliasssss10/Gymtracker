import type { CardioSession, Exercise, Muscle, Workout } from '../types';
import { addDays, startOfWeek } from './format';
import { workingSets, type SetLike } from './progression';
import { epley, loadOf } from './records';

export const setVolume = (ex: Exercise, s: SetLike, bw: number) =>
  ex.measure === 'time' ? 0 : loadOf(ex.measure, s.weight, bw) * s.reps;

export function workoutStats(w: Workout, exMap: Map<string, Exercise>, bw: number) {
  let volume = 0;
  let sets = 0;
  for (const e of w.exercises) {
    const ex = exMap.get(e.exerciseId);
    for (const s of workingSets(e.sets)) {
      sets++;
      if (ex) volume += setVolume(ex, s, bw);
    }
  }
  return { volume, sets, duration: Math.max(0, ((w.endedAt ?? Date.now()) - w.startedAt) / 1000) };
}

/** Wochen in Folge mit mindestens einem Training (laufende Woche zählt, auch wenn noch leer). */
export function weekStreak(timestamps: number[], now = Date.now()): number {
  const weeks = new Set(timestamps.map((t) => startOfWeek(t)));
  let wk = startOfWeek(now);
  if (!weeks.has(wk)) wk = addDays(wk, -7);
  let n = 0;
  while (weeks.has(wk)) {
    n++;
    wk = addDays(wk, -7);
  }
  return n;
}

export function muscleVolume(workouts: Workout[], exMap: Map<string, Exercise>, bw: number, from: number, to: number) {
  const res = new Map<Muscle, { sets: number; kg: number }>();
  for (const w of workouts) {
    if (w.startedAt < from || w.startedAt >= to) continue;
    for (const e of w.exercises) {
      const ex = exMap.get(e.exerciseId);
      if (!ex) continue;
      for (const s of workingSets(e.sets)) {
        const cur = res.get(ex.muscle) ?? { sets: 0, kg: 0 };
        cur.sets++;
        cur.kg += setVolume(ex, s, bw);
        res.set(ex.muscle, cur);
      }
    }
  }
  return res;
}

export interface SeriesPoint {
  date: number;
  top: number;
  e1rm: number | null;
  bestSet: SetLike;
}

/** Verlauf einer Übung: Top-Satz-Gewicht und bestes geschätztes 1RM je Training. */
export function exerciseSeries(workouts: Workout[], ex: Exercise, bw: number): SeriesPoint[] {
  const pts: SeriesPoint[] = [];
  for (const w of workouts) {
    const sets = w.exercises.filter((e) => e.exerciseId === ex.id).flatMap((e) => workingSets(e.sets));
    if (!sets.length) continue;
    if (ex.measure === 'time') {
      const best = sets.reduce((a, b) => (b.reps > a.reps ? b : a));
      pts.push({ date: w.startedAt, top: best.reps, e1rm: null, bestSet: best });
      continue;
    }
    const top = Math.max(...sets.map((s) => s.weight));
    let best = sets[0];
    let bestE = 0;
    for (const s of sets) {
      const e = epley(loadOf(ex.measure, s.weight, bw), s.reps);
      if (e > bestE) {
        bestE = e;
        best = s;
      }
    }
    pts.push({ date: w.startedAt, top, e1rm: Math.round(bestE * 10) / 10, bestSet: best });
  }
  return pts.sort((a, b) => a.date - b.date);
}

export const cardioDuration = (c: CardioSession) =>
  c.mode === 'Intervalle' ? c.rounds * c.workSec + Math.max(0, c.rounds - 1) * c.restSec : c.workSec;
