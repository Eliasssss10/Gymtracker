import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Bike, ChevronRight, Clock, Dumbbell, Footprints, Layers, Plus, Trophy, Waves } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../store';
import { useCardio, useExerciseMap, useWorkouts } from '../hooks/data';
import { prCountsByWorkout } from '../lib/records';
import { cardioDuration, workoutStats } from '../lib/stats';
import { fmt0, fmtClock, fmtDate, fmtDateShort, fmtMinutes, fmtTime } from '../lib/format';
import type { CardioDevice, CardioSession } from '../types';
import { Btn, Empty, ListSkeleton, PageHeader, Segmented, cx } from '../components/ui';
import { CHART, ChartTooltip } from '../components/chart';

export function HistoryScreen() {
  const [seg, setSeg] = useState<'kraft' | 'cardio'>('kraft');
  return (
    <>
      <PageHeader title="Verlauf" />
      <div className="px-4">
        <Segmented
          id="history"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'kraft', label: 'Krafttraining' },
            { value: 'cardio', label: 'Cardio' },
          ]}
        />
      </div>
      <div className="mt-4">{seg === 'kraft' ? <StrengthList /> : <CardioHistory />}</div>
    </>
  );
}

function StrengthList() {
  const workouts = useWorkouts();
  const exMap = useExerciseMap();
  const bw = useApp((s) => s.settings.bodyweight);
  const push = useApp((s) => s.push);

  const prCounts = useMemo(() => (workouts && exMap ? prCountsByWorkout(workouts, exMap, bw) : new Map()), [workouts, exMap, bw]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof workouts>();
    for (const w of workouts ?? []) {
      const k = fmtDate(w.startedAt, { month: 'long', year: 'numeric' });
      m.set(k, [...(m.get(k) ?? []), w]);
    }
    return [...m.entries()];
  }, [workouts]);

  if (!workouts || !exMap) return <ListSkeleton />;
  if (!workouts.length)
    return <Empty icon={<Dumbbell size={28} />} title="Noch keine Trainings" text="Abgeschlossene Trainings erscheinen hier." />;

  let idx = 0;
  return (
    <div className="px-4">
      {groups.map(([month, list]) => (
        <div key={month} className="mb-5">
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">{month}</h2>
          <div className="flex flex-col gap-2">
            {list!.map((w) => {
              const st = workoutStats(w, exMap, bw);
              const prs = prCounts.get(w.id) ?? 0;
              const i = idx++;
              return (
                <motion.button
                  key={w.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.025 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => push({ name: 'workoutDetail', workoutId: w.id })}
                  className="flex items-stretch gap-3 overflow-hidden rounded-3xl border border-line/60 bg-surface p-4 text-left"
                >
                  <span className="w-1 shrink-0 rounded-full" style={{ background: w.dayColor ?? '#c8f53c' }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold">{w.dayName}</span>
                      {w.isTest && <span className="rounded bg-surface-3 px-1.5 text-[10px] font-semibold uppercase text-muted">Test</span>}
                      {prs > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-pr/12 px-1.5 py-0.5 text-[11px] font-bold text-pr">
                          <Trophy size={11} /> {prs}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-muted">
                      {fmtDate(w.startedAt)} · {fmtTime(w.startedAt)}
                    </div>
                    <div className="mt-2 flex gap-4 text-[13px] text-zinc-300 tabular">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-muted" /> {fmtMinutes(st.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell size={13} className="text-muted" /> {fmt0(st.volume)} kg
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers size={13} className="text-muted" /> {st.sets}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="self-center text-muted" />
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export const DEVICE_ICON: Record<CardioDevice, typeof Bike> = { Rudergerät: Waves, Bike: Bike, Laufband: Footprints };
type Metric = 'meters' | 'kcal' | 'min';

function CardioHistory() {
  const cardio = useCardio();
  const push = useApp((s) => s.push);
  const [metric, setMetric] = useState<Metric>('meters');
  const [device, setDevice] = useState<CardioDevice | 'Alle'>('Alle');

  if (!cardio) return <ListSkeleton />;
  const list = cardio.filter((c) => device === 'Alle' || c.device === device);
  const chart = [...list]
    .reverse()
    .map((c) => ({ label: fmtDateShort(c.date), value: metric === 'meters' ? c.meters : metric === 'kcal' ? c.kcal : Math.round(cardioDuration(c) / 60) }));
  const unit = metric === 'meters' ? 'm' : metric === 'kcal' ? 'kcal' : 'min';

  return (
    <div className="px-4">
      <Btn className="mb-4 w-full" onClick={() => push({ name: 'cardio' })}>
        <Plus size={20} /> Cardio eintragen
      </Btn>
      {cardio.length === 0 ? (
        <Empty icon={<Activity size={28} />} title="Noch kein Cardio" text="Rudergerät, Bike oder Laufband – trag deine erste Einheit ein." />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {(['Alle', 'Rudergerät', 'Bike', 'Laufband'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={cx('h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold', device === d ? 'bg-zinc-100 text-zinc-900' : 'bg-surface-2 text-zinc-300')}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="rounded-3xl border border-line/60 bg-surface p-3">
            <Segmented
              id="cardio-metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'meters', label: 'Meter' },
                { value: 'kcal', label: 'kcal' },
                { value: 'min', label: 'Minuten' },
              ]}
            />
            <div className="mt-3 h-52">
              {chart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" tick={CHART.tick} tickLine={false} axisLine={false} />
                    <YAxis tick={CHART.tick} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => fmt0(v)} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip unit={unit} />} />
                    <Bar dataKey="value" name={unit} fill="#4da3ff" radius={[6, 6, 2, 2]} maxBarSize={28} animationDuration={700} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="pt-16 text-center text-sm text-muted">Keine Einträge für {device}.</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {list.map((c) => (
              <CardioRow key={c.id} c={c} onClick={() => push({ name: 'cardio', id: c.id })} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CardioRow({ c, onClick }: { c: CardioSession; onClick: () => void }) {
  const Icon = DEVICE_ICON[c.device];
  return (
    <motion.button whileTap={{ scale: 0.985 }} onClick={onClick} className="flex items-center gap-3 rounded-3xl border border-line/60 bg-surface p-4 text-left">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#4da3ff]/15 text-[#4da3ff]">
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-semibold">{c.device}</span>
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">{c.mode}</span>
          {c.isTest && <span className="rounded bg-surface-3 px-1.5 text-[10px] font-semibold uppercase text-muted">Test</span>}
        </div>
        <div className="mt-0.5 text-[13px] text-muted">
          {fmtDate(c.date)} ·{' '}
          {c.mode === 'Intervalle' ? `${c.rounds} × ${fmtClock(c.workSec)} / ${fmtClock(c.restSec)}` : fmtMinutes(cardioDuration(c))}
        </div>
        <div className="mt-1 flex gap-3 text-[13px] text-zinc-300 tabular">
          {c.meters > 0 && <span>{fmt0(c.meters)} m</span>}
          {c.kcal > 0 && <span>{fmt0(c.kcal)} kcal</span>}
          {c.note && <span className="truncate text-muted">„{c.note}"</span>}
        </div>
      </div>
      <ChevronRight size={20} className="text-muted" />
    </motion.button>
  );
}
