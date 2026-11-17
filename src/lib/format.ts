import type { Exercise } from '../types';

const nf2 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export const fmt = (n: number) => nf2.format(n);
export const fmt1 = (n: number) => nf1.format(n);
export const fmt0 = (n: number) => nf0.format(n);
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '' || t === '.' || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtClock(sec: number): string {
  const v = Math.max(0, Math.round(sec));
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const s = String(v % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function fmtMinutes(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}
/** Montag 00:00 der Woche */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const fmtDate = (
  ts: number,
  o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
) => new Date(ts).toLocaleDateString('de-DE', o);
export const fmtDateShort = (ts: number) =>
  new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

export function fmtAgo(ts: number, now = Date.now()): string {
  const d = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (d <= 0) return 'heute';
  if (d === 1) return 'gestern';
  return `vor ${d} Tagen`;
}

type M = Pick<Exercise, 'measure'>;

export function fmtWeight(ex: M, w: number): string {
  if (ex.measure === 'bodyweight') return w > 0 ? `KG + ${fmt(w)} kg` : 'Körpergewicht';
  return `${fmt(w)} kg`;
}

/** "60 kg × 8, 8, 7" */
export function fmtSets(ex: M, sets: { weight: number; reps: number }[]): string {
  if (!sets.length) return '–';
  if (ex.measure === 'time') {
    const w = sets[0].weight;
    return (w > 0 ? `${fmt(w)} kg · ` : '') + sets.map((s) => `${s.reps} s`).join(', ');
  }
  const same = sets.every((s) => s.weight === sets[0].weight);
  if (same) return `${fmtWeight(ex, sets[0].weight)} × ${sets.map((s) => s.reps).join(', ')}`;
  return sets
    .map((s) =>
      ex.measure === 'bodyweight'
        ? `${s.weight > 0 ? '+' + fmt(s.weight) : 'KG'}×${s.reps}`
        : `${fmt(s.weight)}×${s.reps}`,
    )
    .join(', ');
}
