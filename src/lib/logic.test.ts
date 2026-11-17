import { describe, expect, it } from 'vitest';
import { findLastPerformance, suggest } from './progression';
import { detectPRs, epley, workoutPRs, prCountsByWorkout } from './records';
import { calcPlates } from './plates';
import { exerciseSeries, weekStreak, workoutStats } from './stats';
import { buildWorkout, nextDay } from './build';
import { generateTestData } from '../db/testdata';
import { DEFAULT_EXERCISES, defaultDays } from '../db/defaults';

const W = { measure: 'weight' as const, increment: 2.5 };
const range = { sets: 3, repMin: 6, repMax: 10 };
const s = (weight: number, ...reps: number[]) => reps.map((r) => ({ weight, reps: r }));

describe('Double Progression', () => {
  it('schlägt +2,5 kg vor, wenn alle Sätze das obere Ende erreicht haben', () => {
    const r = suggest(W, range, s(60, 10, 10, 10));
    expect(r).toEqual({ status: 'increase', weight: 62.5, targets: [6, 6, 6] });
  });
  it('sonst gleiches Gewicht, +1 Wdh. pro Satz (gedeckelt)', () => {
    const r = suggest(W, range, s(60, 8, 8, 7));
    expect(r).toEqual({ status: 'reps', weight: 60, targets: [9, 9, 8] });
    expect(suggest(W, range, s(60, 10, 10, 9)).targets).toEqual([10, 10, 10]);
  });
  it('zu wenige Sätze → keine Steigerung', () => {
    expect(suggest(W, range, s(60, 10, 10)).status).toBe('reps');
  });
  it('Isolation mit eigenem Inkrement, Körpergewicht als Zusatzgewicht', () => {
    expect(suggest({ measure: 'weight', increment: 1 }, { sets: 3, repMin: 10, repMax: 15 }, s(10, 15, 15, 15)).weight).toBe(11);
    expect(suggest({ measure: 'bodyweight', increment: 2.5 }, range, s(0, 10, 10, 10)).weight).toBe(2.5);
  });
  it('Zeit-Übungen in 5-s-Schritten', () => {
    const t = { measure: 'time' as const, increment: 0 };
    expect(suggest(t, { sets: 3, repMin: 20, repMax: 40 }, s(0, 30, 25, 38)).targets).toEqual([35, 30, 40]);
    expect(suggest(t, { sets: 3, repMin: 20, repMax: 40 }, s(0, 40, 40, 40)).status).toBe('increase');
  });
  it('ohne Historie: neu', () => {
    expect(suggest(W, range, undefined)).toEqual({ status: 'new', weight: 0, targets: [6, 6, 6] });
  });
});

describe('PR-Erkennung', () => {
  const prior = [...s(60, 10, 9, 8), ...s(62.5, 6)];
  it('höchstes Gewicht', () => {
    expect(detectPRs({ weight: 65, reps: 3 }, prior, 'weight', 80)).toContain('weight');
  });
  it('geschätztes 1RM nach Epley', () => {
    expect(epley(60, 10)).toBeCloseTo(80);
    expect(detectPRs({ weight: 60, reps: 11 }, prior, 'weight', 80)).toEqual(['e1rm', 'reps']);
  });
  it('meiste Wdh. bei Gewicht', () => {
    expect(detectPRs({ weight: 62.5, reps: 7 }, prior, 'weight', 80)).toContain('reps');
    expect(detectPRs({ weight: 57.5, reps: 10 }, prior, 'weight', 80)).toEqual([]);
  });
  it('kein PR beim allerersten Mal', () => {
    expect(detectPRs({ weight: 100, reps: 5 }, [], 'weight', 80)).toEqual([]);
  });
});

describe('Hantelscheiben', () => {
  it('100 kg mit 20-kg-Stange', () => {
    expect(calcPlates(100, 20).perSide).toEqual([25, 15]);
  });
  it('62,5 kg', () => {
    const r = calcPlates(62.5, 20);
    expect(r.perSide).toEqual([20, 1.25]);
    expect(r.remainder).toBe(0);
  });
  it('nicht exakt ladbar → Rest', () => {
    expect(calcPlates(21, 20).remainder).toBe(0.5);
  });
});

describe('Testdaten (3 Wochen)', () => {
  const now = new Date(2026, 10, 16, 12).getTime(); // Mo, 16.11.2026
  const days = defaultDays();
  const exMap = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));
  const { workouts, cardio } = generateTestData(days, DEFAULT_EXERCISES, now);

  it('15 Trainings, Rotation stimmt, nächster Tag = Push', () => {
    expect(workouts).toHaveLength(15);
    expect(workouts.slice(0, 5).map((w) => w.dayName)).toEqual(['Push', 'Pull', 'Legs', 'Upper', 'Lower']);
    expect(nextDay(days, workouts)?.name).toBe('Push');
    expect(cardio.length).toBeGreaterThan(3);
  });

  it('Vorschläge fürs nächste Push folgen der letzten Leistung', () => {
    const push = days.find((d) => d.id === 'push')!;
    const w = buildWorkout(push, exMap, workouts);
    const report = w.exercises.map((we) => {
      const ex = exMap.get(we.exerciseId)!;
      const last = findLastPerformance(workouts, ex.id)!;
      const sug = suggest(ex, { sets: we.plannedSets, repMin: we.repMin, repMax: we.repMax }, last.sets);
      return { name: ex.name, last: last.sets.map((x) => `${x.weight}x${x.reps}`).join(' '), sug: sug.status, weight: sug.weight, targets: sug.targets.join('/') };
    });
    console.table(report);
    for (const r of report) {
      const lastW = Math.max(...r.last.split(' ').map((x) => Number(x.split('x')[0])));
      if (r.sug === 'increase') expect(r.weight).toBeGreaterThan(lastW);
      else expect(r.weight).toBe(lastW);
    }
    expect(report.some((r) => r.sug === 'increase')).toBe(true);
    // Vorbefüllte Sätze entsprechen dem Vorschlag
    expect(w.exercises[0].sets.every((x) => !x.done && x.weight > 0)).toBe(true);
  });

  it('PRs werden erkannt und Aufwärmsätze zählen nicht', () => {
    const counts = prCountsByWorkout(workouts, exMap, 80);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(5);
    const lastPush = workouts.filter((w) => w.dayId === 'push').at(-1)!;
    const hits = workoutPRs(lastPush, workouts, exMap, 80);
    expect(hits.length).toBe(counts.get(lastPush.id));
    const bench = lastPush.exercises[0];
    expect(bench.sets.some((x) => x.warmup)).toBe(true);
    const stats = workoutStats({ ...lastPush, exercises: [bench] }, exMap, 80);
    const manual = bench.sets.filter((x) => !x.warmup).reduce((a, x) => a + x.weight * x.reps, 0);
    expect(stats.volume).toBe(manual);
  });

  it('Diagramm-Daten: Bankdrücken (Push + Upper) chronologisch', () => {
    const series = exerciseSeries(workouts, exMap.get('bankdruecken')!, 80);
    expect(series).toHaveLength(6);
    for (let i = 1; i < series.length; i++) expect(series[i].date).toBeGreaterThan(series[i - 1].date);
    expect(series.every((p) => p.e1rm! >= p.top)).toBe(true);
    expect(weekStreak(workouts.map((w) => w.startedAt), now)).toBe(3);
  });
});
