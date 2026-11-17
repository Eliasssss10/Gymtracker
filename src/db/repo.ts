import { db } from './db';
import { DEFAULT_EXERCISES, DEFAULT_SETTINGS, defaultDays } from './defaults';
import { generateTestData } from './testdata';
import type { CardioSession, Exercise, PlanDay, Settings, Workout } from '../types';

export async function ensureSeed() {
  if ((await db.exercises.count()) > 0) return;
  await db.transaction('rw', db.exercises, db.days, async () => {
    await db.exercises.bulkPut(DEFAULT_EXERCISES);
    await db.days.bulkPut(defaultDays());
  });
}

export async function loadSettings(): Promise<Settings> {
  const r = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((r?.value as Partial<Settings>) ?? {}) };
}
export const saveSettings = (s: Settings) => db.kv.put({ key: 'settings', value: s });

export async function loadActive(): Promise<Workout | null> {
  const r = await db.kv.get('active');
  return (r?.value as Workout) ?? null;
}
export const saveActive = (w: Workout | null) =>
  w ? db.kv.put({ key: 'active', value: w }) : db.kv.delete('active');

/** Speichert das laufende Training als abgeschlossen (nur abgehakte Sätze). */
export async function finishActive(w: Workout): Promise<Workout> {
  const clean: Workout = {
    ...w,
    endedAt: Date.now(),
    exercises: w.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0),
  };
  await db.transaction('rw', db.workouts, db.kv, async () => {
    await db.workouts.put(clean);
    await db.kv.delete('active');
  });
  return clean;
}

// ---------- Backup ----------

export interface Backup {
  app: 'gym-tracker';
  version: 1;
  exportedAt: number;
  exercises: Exercise[];
  days: PlanDay[];
  workouts: Workout[];
  cardio: CardioSession[];
  settings: Settings;
}

export async function exportBackup(): Promise<Backup> {
  const [exercises, days, workouts, cardio, settings] = await Promise.all([
    db.exercises.toArray(), db.days.toArray(), db.workouts.toArray(), db.cardio.toArray(), loadSettings(),
  ]);
  return { app: 'gym-tracker', version: 1, exportedAt: Date.now(), exercises, days, workouts, cardio, settings };
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text);
  if (!data || data.app !== 'gym-tracker' || !Array.isArray(data.exercises) || !Array.isArray(data.workouts)) {
    throw new Error('Das ist keine gültige Gym-Tracker-Sicherung.');
  }
  return { ...data, days: data.days ?? [], cardio: data.cardio ?? [], settings: { ...DEFAULT_SETTINGS, ...data.settings } };
}

export async function importBackup(b: Backup) {
  await db.transaction('rw', [db.exercises, db.days, db.workouts, db.cardio, db.kv], async () => {
    await Promise.all([db.exercises.clear(), db.days.clear(), db.workouts.clear(), db.cardio.clear()]);
    await db.exercises.bulkPut(b.exercises);
    await db.days.bulkPut(b.days);
    await db.workouts.bulkPut(b.workouts);
    await db.cardio.bulkPut(b.cardio);
    await db.kv.put({ key: 'settings', value: b.settings });
  });
}

// ---------- Testdaten ----------

export async function loadTestData() {
  const [days, exercises] = await Promise.all([db.days.toArray(), db.exercises.toArray()]);
  const { workouts, cardio } = generateTestData(days, exercises);
  await db.transaction('rw', db.workouts, db.cardio, async () => {
    await db.workouts.bulkPut(workouts);
    await db.cardio.bulkPut(cardio);
  });
  return { workouts: workouts.length, cardio: cardio.length };
}

export async function countTestData() {
  const [w, c] = await Promise.all([
    db.workouts.filter((x) => !!x.isTest).count(),
    db.cardio.filter((x) => !!x.isTest).count(),
  ]);
  return w + c;
}

export async function clearTestData() {
  await db.transaction('rw', db.workouts, db.cardio, async () => {
    await db.workouts.filter((w) => !!w.isTest).delete();
    await db.cardio.filter((c) => !!c.isTest).delete();
  });
}

export async function resetAll() {
  await db.transaction('rw', [db.exercises, db.days, db.workouts, db.cardio, db.kv], async () => {
    await Promise.all([db.exercises.clear(), db.days.clear(), db.workouts.clear(), db.cardio.clear(), db.kv.clear()]);
  });
  await ensureSeed();
}
