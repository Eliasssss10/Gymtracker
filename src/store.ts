import { create } from 'zustand';
import { produce } from 'immer';
import type { Settings, Workout } from './types';
import { DEFAULT_SETTINGS } from './db/defaults';
import { ensureSeed, loadActive, loadSettings, saveActive, saveSettings } from './db/repo';
import { setHapticsEnabled } from './lib/feedback';

export type Tab = 'today' | 'history' | 'stats' | 'plan' | 'settings';
export type Screen =
  | { name: 'workout' }
  | { name: 'summary'; workoutId: string }
  | { name: 'workoutDetail'; workoutId: string }
  | { name: 'cardio'; id?: string }
  | { name: 'day'; dayId: string };

export interface Toast {
  id: number;
  text: string;
  tone?: 'default' | 'pr';
  action?: { label: string; run: () => void };
}
export interface Rest {
  endAt: number;
  total: number;
  label: string;
  done?: boolean;
}

interface AppState {
  ready: boolean;
  settings: Settings;
  active: Workout | null;
  tab: Tab;
  stack: Screen[];
  rest: Rest | null;
  toast: Toast | null;

  init: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  updateSettings: (p: Partial<Settings>) => void;
  setTab: (t: Tab) => void;
  push: (s: Screen) => void;
  pop: () => void;
  replaceTop: (s: Screen) => void;
  setActive: (w: Workout | null) => void;
  mutateActive: (fn: (w: Workout) => void) => void;
  startRest: (sec: number, label: string) => void;
  adjustRest: (deltaSec: number) => void;
  markRestDone: () => void;
  stopRest: () => void;
  showToast: (text: string, opts?: Omit<Toast, 'id' | 'text'>) => void;
  hideToast: () => void;
}

const REST_KEY = 'gym.rest';
function persistRest(r: Rest | null) {
  try {
    if (r) localStorage.setItem(REST_KEY, JSON.stringify(r));
    else localStorage.removeItem(REST_KEY);
  } catch {
    /* privat-Modus */
  }
}
function readRest(): Rest | null {
  try {
    const r = JSON.parse(localStorage.getItem(REST_KEY) ?? 'null') as Rest | null;
    return r && r.endAt > Date.now() ? r : null;
  } catch {
    return null;
  }
}

let toastId = 0;

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  active: null,
  tab: 'today',
  stack: [],
  rest: null,
  toast: null,

  init: async () => {
    if (get().ready) return;
    await ensureSeed();
    const [settings, active] = await Promise.all([loadSettings(), loadActive()]);
    setHapticsEnabled(settings.vibration);
    set({ settings, active, rest: active ? readRest() : null, ready: true });
  },
  reloadSettings: async () => {
    const settings = await loadSettings();
    setHapticsEnabled(settings.vibration);
    set({ settings });
  },
  updateSettings: (p) => {
    const settings = { ...get().settings, ...p };
    setHapticsEnabled(settings.vibration);
    set({ settings });
    void saveSettings(settings);
  },

  setTab: (tab) => set({ tab }),
  push: (s) => set({ stack: [...get().stack, s] }),
  pop: () => set({ stack: get().stack.slice(0, -1) }),
  replaceTop: (s) => set({ stack: [...get().stack.slice(0, -1), s] }),

  setActive: (w) => {
    set({ active: w });
    void saveActive(w);
  },
  mutateActive: (fn) => {
    const cur = get().active;
    if (!cur) return;
    const next = produce(cur, fn);
    set({ active: next });
    void saveActive(next);
  },

  startRest: (sec, label) => {
    const rest = { endAt: Date.now() + sec * 1000, total: sec, label };
    persistRest(rest);
    set({ rest });
  },
  adjustRest: (d) => {
    const r = get().rest;
    if (!r) return;
    const endAt = r.endAt + d * 1000;
    const remaining = (endAt - Date.now()) / 1000;
    if (remaining <= 0) return get().stopRest();
    const rest = { ...r, endAt, total: Math.max(r.total + (d > 0 ? d : 0), remaining), done: false };
    persistRest(rest);
    set({ rest });
  },
  markRestDone: () => {
    const r = get().rest;
    if (r) set({ rest: { ...r, done: true } });
    persistRest(null);
  },
  stopRest: () => {
    persistRest(null);
    set({ rest: null });
  },

  showToast: (text, opts) => set({ toast: { id: ++toastId, text, ...opts } }),
  hideToast: () => set({ toast: null }),
}));
