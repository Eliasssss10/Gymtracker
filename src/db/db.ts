import Dexie, { type Table } from 'dexie';
import type { CardioSession, Exercise, PlanDay, Workout } from '../types';

export class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  days!: Table<PlanDay, string>;
  workouts!: Table<Workout, string>;
  cardio!: Table<CardioSession, string>;
  kv!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('gym-tracker');
    this.version(1).stores({
      exercises: 'id',
      days: 'id, order',
      workouts: 'id, startedAt, dayId',
      cardio: 'id, date',
      kv: 'key',
    });
  }
}

export const db = new GymDB();
