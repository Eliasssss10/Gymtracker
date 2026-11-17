import type { CardioSession, Exercise, PlanDay, SetEntry, Workout, WorkoutExercise } from '../types';
import { addDays, startOfDay, startOfWeek } from '../lib/format';
import { suggest, type SetLike } from '../lib/progression';
import { uid } from '../lib/uid';

/** Startgewichte für die Simulation */
const START: Record<string, number> = {
  bankdruecken: 70, seitheben: 10, 'trizeps-pushdowns': 25, schraegbank: 55, 'trizeps-overhead': 20, flys: 14,
  klimmzuege: 0, 'preacher-curls': 25, 'tbar-rudern': 50, 'bayesian-curls': 10, 'hintere-schulter': 8,
  pullover: 30, 'hammer-curls': 16, hackenschmidt: 80, bauch: 30, beinbeuger: 40, 'romanian-split-squat': 20,
  latzug: 65, 'enges-rudern': 60, trizeps: 25, rdl: 90, 'rs-squats': 20, beinpresse: 140, copenhagen: 0,
  wadenheben: 60, adduktoren: 50,
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 3 Wochen Beispieltrainings (Mo–Fr, Rotation Push→Pull→Legs→Upper→Lower).
 * Die Leistung folgt den Vorschlägen der App plus etwas Zufall – so entstehen
 * echte Steigerungen, PRs und auch mal ein schlechterer Satz.
 */
export function generateTestData(days: PlanDay[], exercises: Exercise[], now = Date.now()) {
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const sorted = [...days].sort((a, b) => a.order - b.order);
  const rnd = mulberry32(20261116);
  const today = startOfDay(now);
  const firstMonday = addDays(startOfWeek(now), -21);
  const last = new Map<string, SetLike[]>();
  const workouts: Workout[] = [];
  let rot = 0;

  for (let week = 0; week < 3; week++) {
    for (let dow = 0; dow < 5; dow++) {
      const date = addDays(firstMonday, week * 7 + dow);
      if (date >= today || !sorted.length) continue;
      const day = sorted[rot++ % sorted.length];
      const startedAt = date + (17 * 60 + 15 + Math.floor(rnd() * 40)) * 60_000;
      let t = startedAt;
      const occ = new Map<string, number>();
      const wex: WorkoutExercise[] = [];

      for (const item of day.items) {
        const ex = exMap.get(item.exerciseId);
        if (!ex) continue;
        const o = occ.get(ex.id) ?? 0;
        occ.set(ex.id, o + 1);
        const key = `${ex.id}#${o}`;
        const prev = last.get(key);
        const sug = suggest(ex, item, prev);
        const isTime = ex.measure === 'time';
        const weight = prev ? sug.weight : START[ex.id] ?? 20;
        const targets = prev ? sug.targets : Array(item.sets).fill(isTime ? 25 : item.repMax - 2);
        const sets: SetEntry[] = [];

        if (ex.barbell && week === 2) {
          t += 3 * 60_000;
          sets.push({ id: uid(), weight: Math.round((weight * 0.5) / 2.5) * 2.5, reps: 10, done: true, warmup: true, doneAt: t });
        }
        targets.forEach((target, i) => {
          const r = rnd();
          let delta = r < 0.16 ? -1 : r > 0.9 ? 1 : 0;
          if (i === targets.length - 1 && rnd() < 0.25) delta -= 1;
          const reps = isTime ? Math.max(10, target + delta * 5) : Math.max(1, Math.min(item.repMax + 1, target + delta));
          t += (2 + Math.floor(rnd() * 2)) * 60_000;
          sets.push({ id: uid(), weight, reps, done: true, warmup: false, doneAt: t });
        });
        last.set(key, sets.filter((s) => !s.warmup).map((s) => ({ weight: s.weight, reps: s.reps })));
        wex.push({
          uid: uid(), exerciseId: ex.id, plannedSets: item.sets, repMin: item.repMin, repMax: item.repMax,
          restSec: item.restSec ?? null, sets,
        });
      }
      workouts.push({
        id: uid(), dayId: day.id, dayName: day.name, dayColor: day.color, startedAt, endedAt: t + 4 * 60_000,
        note: week === 1 && dow === 0 ? 'Schulter etwas zwickig, sonst stark.' : '', exercises: wex, isTest: true,
      });
    }
  }

  const cardioPlan: [number, CardioSession['device'], CardioSession['mode'], number, number, number, number, number][] = [
    // [Tag-Offset, Gerät, Typ, Arbeit s, Pause s, Runden, Meter, kcal]
    [5, 'Rudergerät', 'Intervalle', 60, 60, 8, 2150, 165],
    [2, 'Bike', 'Zone 2', 30 * 60, 0, 1, 11800, 270],
    [12, 'Rudergerät', 'Intervalle', 60, 60, 9, 2480, 188],
    [9, 'Laufband', 'Zone 2', 35 * 60, 0, 1, 4300, 330],
    [16, 'Bike', 'Zone 2', 40 * 60, 0, 1, 16100, 360],
    [19, 'Rudergerät', 'Intervalle', 60, 45, 10, 2790, 214],
  ];
  const cardio: CardioSession[] = cardioPlan
    .map(([off, device, mode, workSec, restSec, rounds, meters, kcal]) => ({
      id: uid(), date: addDays(firstMonday, off) + 18.5 * 3_600_000, device, mode, workSec, restSec, rounds, meters, kcal,
      note: '', isTest: true,
    }))
    .filter((c) => c.date < today);

  return { workouts, cardio };
}
