import type { Exercise, ExerciseKind, MeasureType, Muscle, PlanDay, PlanItem, Settings } from '../types';
import { defaultRange } from '../lib/build';

export const DEFAULT_SETTINGS: Settings = {
  restCompound: 150,
  restIsolation: 90,
  restWarmup: 60,
  weightStep: 2.5,
  bodyweight: 80,
  barWeight: 20,
  sound: true,
  vibration: true,
  nextDayId: null,
};

export const DAY_COLORS = ['#ff7a45', '#4da3ff', '#c8f53c', '#b18cff', '#ffb020', '#ff5c93', '#2dd4bf'];

function ex(
  id: string,
  name: string,
  kind: ExerciseKind,
  muscle: Muscle,
  opts: { measure?: MeasureType; barbell?: boolean; increment?: number } = {},
): Exercise {
  const measure = opts.measure ?? 'weight';
  return {
    id,
    name,
    kind,
    measure,
    muscle,
    increment: opts.increment ?? (kind === 'compound' ? 2.5 : 2),
    barbell: opts.barbell ?? false,
    note: '',
  };
}

export const DEFAULT_EXERCISES: Exercise[] = [
  ex('bankdruecken', 'Bankdrücken', 'compound', 'Brust', { barbell: true }),
  ex('seitheben', 'Seitheben', 'isolation', 'Schultern', { increment: 1 }),
  ex('trizeps-pushdowns', 'Trizeps Pushdowns', 'isolation', 'Trizeps'),
  ex('schraegbank', 'Schrägbankdrücken', 'compound', 'Brust', { barbell: true }),
  ex('trizeps-overhead', 'Trizeps (Overhead Extension)', 'isolation', 'Trizeps'),
  ex('flys', 'Flys', 'isolation', 'Brust'),
  ex('klimmzuege', 'Klimmzüge', 'compound', 'Rücken', { measure: 'bodyweight' }),
  ex('preacher-curls', 'Preacher Curls', 'isolation', 'Bizeps'),
  ex('tbar-rudern', 'T-Bar Rudern', 'compound', 'Rücken'),
  ex('bayesian-curls', 'Bayesian Curls', 'isolation', 'Bizeps'),
  ex('hintere-schulter', 'Hintere Schulter', 'isolation', 'Schultern', { increment: 1 }),
  ex('pullover', 'Pullover', 'isolation', 'Rücken'),
  ex('hammer-curls', 'Hammer Curls', 'isolation', 'Bizeps'),
  ex('hackenschmidt', 'Hackenschmidt', 'compound', 'Quadrizeps'),
  ex('bauch', 'Bauch', 'isolation', 'Bauch'),
  ex('beinbeuger', 'Beinbeuger', 'isolation', 'Beinbeuger'),
  ex('romanian-split-squat', 'Romanian Split Squat', 'compound', 'Quadrizeps'),
  ex('latzug', 'Latzug', 'compound', 'Rücken'),
  ex('enges-rudern', 'Enges Rudern', 'compound', 'Rücken'),
  ex('trizeps', 'Trizeps', 'isolation', 'Trizeps'),
  ex('rdl', 'RDL', 'compound', 'Beinbeuger', { barbell: true }),
  ex('rs-squats', 'RS Squats', 'compound', 'Quadrizeps'),
  ex('beinpresse', 'Beinpresse', 'compound', 'Quadrizeps', { increment: 5 }),
  ex('copenhagen', 'Copenhagen Planks', 'isolation', 'Adduktoren', { measure: 'time' }),
  ex('wadenheben', 'Wadenheben', 'isolation', 'Waden', { increment: 2.5 }),
  ex('adduktoren', 'Adduktoren', 'isolation', 'Adduktoren', { increment: 2.5 }),
];

const PLAN: [string, string, string[]][] = [
  ['push', 'Push', ['bankdruecken', 'seitheben', 'trizeps-pushdowns', 'schraegbank', 'trizeps-overhead', 'flys']],
  ['pull', 'Pull', ['klimmzuege', 'preacher-curls', 'tbar-rudern', 'bayesian-curls', 'hintere-schulter', 'pullover', 'hammer-curls']],
  ['legs', 'Legs', ['hackenschmidt', 'bauch', 'beinbeuger', 'romanian-split-squat', 'bauch']],
  ['upper', 'Upper', ['latzug', 'bankdruecken', 'enges-rudern', 'seitheben', 'trizeps', 'preacher-curls']],
  ['lower', 'Lower', ['rdl', 'rs-squats', 'beinpresse', 'copenhagen', 'wadenheben', 'adduktoren']],
];

export function defaultDays(): PlanDay[] {
  const byId = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));
  return PLAN.map(([id, name, ids], order) => ({
    id,
    name,
    order,
    color: DAY_COLORS[order % DAY_COLORS.length],
    items: ids.map((exId, i): PlanItem => {
      const e = byId.get(exId)!;
      return { uid: `${id}-${i}`, exerciseId: exId, sets: 3, ...defaultRange(e.kind, e.measure), restSec: null };
    }),
  }));
}
