export type ExerciseKind = 'compound' | 'isolation';
export type MeasureType = 'weight' | 'bodyweight' | 'time';

export const MUSCLES = [
  'Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps',
  'Quadrizeps', 'Beinbeuger', 'Waden', 'Bauch', 'Adduktoren',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  measure: MeasureType;
  muscle: Muscle;
  /** Steigerung in kg, wenn alle Sätze das obere Ende geschafft haben */
  increment: number;
  /** Langhantel → Scheibenrechner anbieten */
  barbell?: boolean;
  note?: string;
}

export interface PlanItem {
  uid: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** eigene Pausenzeit in s, sonst Standard aus den Einstellungen */
  restSec?: number | null;
}

export interface PlanDay {
  id: string;
  name: string;
  order: number;
  color: string;
  items: PlanItem[];
}

export interface SetEntry {
  id: string;
  /** kg – bei Körpergewicht: Zusatzgewicht */
  weight: number;
  /** Wiederholungen – bei Zeit-Übungen: Sekunden */
  reps: number;
  done: boolean;
  warmup: boolean;
  doneAt?: number;
}

export interface WorkoutExercise {
  uid: string;
  exerciseId: string;
  plannedSets: number;
  repMin: number;
  repMax: number;
  restSec?: number | null;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  dayId: string;
  dayName: string;
  dayColor?: string;
  startedAt: number;
  endedAt?: number;
  note: string;
  exercises: WorkoutExercise[];
  isTest?: boolean;
}

export const CARDIO_DEVICES = ['Rudergerät', 'Bike', 'Laufband'] as const;
export type CardioDevice = (typeof CARDIO_DEVICES)[number];
export const CARDIO_MODES = ['Intervalle', 'Zone 2'] as const;
export type CardioMode = (typeof CARDIO_MODES)[number];

export interface CardioSession {
  id: string;
  date: number;
  device: CardioDevice;
  mode: CardioMode;
  workSec: number;
  restSec: number;
  rounds: number;
  meters: number;
  kcal: number;
  note: string;
  isTest?: boolean;
}

export interface Settings {
  restCompound: number;
  restIsolation: number;
  restWarmup: number;
  weightStep: number;
  bodyweight: number;
  barWeight: number;
  sound: boolean;
  vibration: boolean;
  /** manuell gewählter nächster Trainingstag */
  nextDayId: string | null;
}
