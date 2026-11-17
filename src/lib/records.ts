import type { Exercise, MeasureType, Workout } from '../types';
import { workingSets, type SetLike } from './progression';

export type PRType = 'weight' | 'e1rm' | 'reps' | 'time';
export const PR_LABEL: Record<PRType, string> = {
  weight: 'Höchstgewicht',
  e1rm: 'Geschätztes 1RM',
  reps: 'Meiste Wdh.',
  time: 'Längste Zeit',
};

/** Epley: 1RM = w × (1 + r/30) */
export const epley = (w: number, r: number) => (r <= 0 || w <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));

/** tatsächlich bewegte Last (bei Klimmzügen: Körpergewicht + Zusatz) */
export const loadOf = (measure: MeasureType, weight: number, bw: number) =>
  measure === 'bodyweight' ? bw + weight : weight;

/** Alle Arbeitssätze einer Übung aus abgeschlossenen Workouts (optional nur vor `before`). */
export function historySets(workouts: Workout[], exerciseId: string, before = Infinity, excludeId?: string): SetLike[] {
  const out: SetLike[] = [];
  for (const w of workouts) {
    if (w.endedAt == null || w.id === excludeId || w.startedAt >= before) continue;
    for (const e of w.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of workingSets(e.sets)) out.push({ weight: s.weight, reps: s.reps });
    }
  }
  return out;
}

/** Welche Rekorde bricht `set` gegenüber `prior`? Ohne Vorgeschichte gibt es keinen PR. */
export function detectPRs(set: SetLike, prior: SetLike[], measure: MeasureType, bw: number): PRType[] {
  if (!prior.length || set.reps <= 0) return [];
  if (measure === 'time') {
    return set.reps > Math.max(...prior.map((p) => p.reps)) ? ['time'] : [];
  }
  const out: PRType[] = [];
  if (set.weight > Math.max(...prior.map((p) => p.weight))) out.push('weight');
  const e = epley(loadOf(measure, set.weight, bw), set.reps);
  const maxE = Math.max(...prior.map((p) => epley(loadOf(measure, p.weight, bw), p.reps)));
  if (e > maxE + 1e-9) out.push('e1rm');
  const heavier = prior.filter((p) => p.weight >= set.weight);
  if (heavier.length && set.reps > Math.max(...heavier.map((p) => p.reps))) out.push('reps');
  return out;
}

export interface PRHit {
  exerciseId: string;
  type: PRType;
  weight: number;
  reps: number;
  value: number;
}

/** Rekorde eines Workouts gegenüber allen früheren Workouts (bestes Ergebnis pro Typ). */
export function workoutPRs(w: Workout, all: Workout[], exMap: Map<string, Exercise>, bw: number): PRHit[] {
  const hits: PRHit[] = [];
  const ids = [...new Set(w.exercises.map((e) => e.exerciseId))];
  for (const id of ids) {
    const ex = exMap.get(id);
    if (!ex) continue;
    const prior = historySets(all, id, w.startedAt, w.id);
    const best = new Map<PRType, PRHit>();
    for (const e of w.exercises) {
      if (e.exerciseId !== id) continue;
      for (const s of workingSets(e.sets)) {
        for (const t of detectPRs(s, prior, ex.measure, bw)) {
          const value =
            t === 'e1rm' ? epley(loadOf(ex.measure, s.weight, bw), s.reps) : t === 'weight' ? s.weight : s.reps;
          const cur = best.get(t);
          if (!cur || value > cur.value) best.set(t, { exerciseId: id, type: t, weight: s.weight, reps: s.reps, value });
        }
      }
    }
    hits.push(...best.values());
  }
  return hits;
}

/** PR-Anzahl je Workout in einem Durchlauf (für Listen). */
export function prCountsByWorkout(all: Workout[], exMap: Map<string, Exercise>, bw: number): Map<string, number> {
  const asc = all.filter((w) => w.endedAt != null).sort((a, b) => a.startedAt - b.startedAt);
  const prior = new Map<string, SetLike[]>();
  const res = new Map<string, number>();
  for (const w of asc) {
    let count = 0;
    const added: [string, SetLike][] = [];
    for (const id of new Set(w.exercises.map((e) => e.exerciseId))) {
      const ex = exMap.get(id);
      if (!ex) continue;
      const p = prior.get(id) ?? [];
      const types = new Set<PRType>();
      for (const e of w.exercises) {
        if (e.exerciseId !== id) continue;
        for (const s of workingSets(e.sets)) {
          detectPRs(s, p, ex.measure, bw).forEach((t) => types.add(t));
          added.push([id, s]);
        }
      }
      count += types.size;
    }
    for (const [id, s] of added) {
      if (!prior.has(id)) prior.set(id, []);
      prior.get(id)!.push(s);
    }
    res.set(w.id, count);
  }
  return res;
}
