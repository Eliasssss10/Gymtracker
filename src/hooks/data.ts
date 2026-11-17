import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Exercise } from '../types';

export const useExercises = () => useLiveQuery(() => db.exercises.toArray(), []);

export function useExerciseMap(): Map<string, Exercise> | undefined {
  const ex = useExercises();
  return useMemo(() => (ex ? new Map(ex.map((e) => [e.id, e])) : undefined), [ex]);
}

export const useDays = () => useLiveQuery(() => db.days.orderBy('order').toArray(), []);

/** Abgeschlossene Workouts, neueste zuerst */
export const useWorkouts = () => useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), []);

/** Cardio-Einheiten, neueste zuerst */
export const useCardio = () => useLiveQuery(() => db.cardio.orderBy('date').reverse().toArray(), []);

export function useNow(intervalMs: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

/** Bildschirm bleibt an, solange `active` – wird beim Zurückkehren in die App neu angefordert. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        /* nicht erlaubt (z. B. Energiesparmodus) */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === 'visible' && !cancelled) void request();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
