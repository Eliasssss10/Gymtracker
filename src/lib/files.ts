import type { CardioSession, Exercise, Workout } from '../types';
import { cardioDuration } from './stats';
import { epley, loadOf } from './records';
import { dayKey, fmtTime } from './format';

const num = (n: number, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',');
const cell = (v: string | number) => {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: (string | number)[][]) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');

export function workoutsCsv(workouts: Workout[], exMap: Map<string, Exercise>, bw: number): string {
  const rows: (string | number)[][] = [
    ['Datum', 'Uhrzeit', 'Training', 'Übung', 'Satz', 'Aufwärmsatz', 'Gewicht (kg)', 'Wdh./Sek.', 'Volumen (kg)', 'Geschätztes 1RM', 'Notiz'],
  ];
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const e of w.exercises) {
      const ex = exMap.get(e.exerciseId);
      let n = 0;
      for (const s of e.sets) {
        if (!s.done) continue;
        const measure = ex?.measure ?? 'weight';
        const load = loadOf(measure, s.weight, bw);
        const vol = s.warmup || measure === 'time' ? 0 : load * s.reps;
        rows.push([
          dayKey(w.startedAt), fmtTime(w.startedAt), w.dayName, ex?.name ?? e.exerciseId, s.warmup ? 'W' : ++n,
          s.warmup ? 'ja' : 'nein', num(s.weight), s.reps, num(vol), measure === 'time' ? '' : num(epley(load, s.reps), 1),
          n === 1 && !s.warmup ? w.note : '',
        ]);
      }
    }
  }
  return toCsv(rows);
}

export function cardioCsv(cardio: CardioSession[]): string {
  const rows: (string | number)[][] = [
    ['Datum', 'Gerät', 'Typ', 'Arbeitszeit (s)', 'Pausenzeit (s)', 'Runden', 'Gesamtdauer (min)', 'Meter', 'Kalorien', 'Notiz'],
  ];
  for (const c of [...cardio].sort((a, b) => a.date - b.date)) {
    rows.push([dayKey(c.date), c.device, c.mode, c.workSec, c.restSec, c.rounds, num(cardioDuration(c) / 60, 1), c.meters, c.kcal, c.note]);
  }
  return toCsv(rows);
}

/** Auf dem iPhone über das Teilen-Menü (→ „In Dateien sichern"), sonst als Download. */
export async function saveFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  if (touch && typeof File !== 'undefined') {
    const file = new File([blob], name, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
