import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../store';
import { useCardio, useExerciseMap, useWorkouts } from '../hooks/data';
import { exerciseSeries, muscleVolume, weekStreak } from '../lib/stats';
import { addDays, dayKey, fmt, fmt0, fmt1, fmtDate, fmtDateShort, startOfDay, startOfWeek } from '../lib/format';
import { MUSCLES, type Exercise, type Workout } from '../types';
import { Card, Empty, PageHeader, SectionTitle, Segmented, Skeleton, cx } from '../components/ui';
import { CHART, ChartTooltip } from '../components/chart';

export function StatsScreen() {
  const workouts = useWorkouts();
  const cardio = useCardio();
  const exMap = useExerciseMap();
  const bw = useApp((s) => s.settings.bodyweight);

  if (!workouts || !cardio || !exMap) {
    return (
      <>
        <PageHeader title="Statistik" />
        <div className="flex flex-col gap-3 px-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-44" />
          <Skeleton className="h-72" />
        </div>
      </>
    );
  }
  if (!workouts.length && !cardio.length) {
    return (
      <>
        <PageHeader title="Statistik" />
        <Empty icon={<Trophy size={28} />} title="Noch keine Daten" text="Nach deinem ersten Training siehst du hier Fortschritt, Rekorde und Volumen." />
      </>
    );
  }

  const times = [...workouts.map((w) => w.startedAt), ...cardio.map((c) => c.date)];
  const monthAgo = addDays(Date.now(), -30);

  return (
    <>
      <PageHeader title="Statistik" />
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat icon={<Flame size={15} className="text-pr" />} value={weekStreak(times)} label="Wochen-Streak" />
          <MiniStat value={workouts.filter((w) => w.startedAt >= monthAgo).length} label="Trainings / 30 T." />
          <MiniStat value={workouts.length} label="Trainings gesamt" />
        </div>

        <SectionTitle>Trainingstage</SectionTitle>
        <Heatmap workouts={workouts} cardioDays={cardio.map((c) => c.date)} />

        <SectionTitle>Wochenvolumen pro Muskelgruppe</SectionTitle>
        <MuscleWeek workouts={workouts} exMap={exMap} bw={bw} />

        <SectionTitle>Fortschritt pro Übung</SectionTitle>
        <ExerciseProgress workouts={workouts} exMap={exMap} bw={bw} />
      </div>
    </>
  );
}

function MiniStat({ value, label, icon }: { value: number; label: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface px-3 py-3">
      <div className="flex items-center gap-1 text-[24px] font-bold leading-7 tabular">
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

const WEEKS = 18;

function Heatmap({ workouts, cardioDays }: { workouts: Workout[]; cardioDays: number[] }) {
  const { cols, months } = useMemo(() => {
    const counts = new Map<string, { s: number; c: number }>();
    for (const w of workouts) {
      const k = dayKey(w.startedAt);
      counts.set(k, { s: (counts.get(k)?.s ?? 0) + 1, c: counts.get(k)?.c ?? 0 });
    }
    for (const t of cardioDays) {
      const k = dayKey(t);
      counts.set(k, { s: counts.get(k)?.s ?? 0, c: (counts.get(k)?.c ?? 0) + 1 });
    }
    const first = addDays(startOfWeek(Date.now()), -(WEEKS - 1) * 7);
    const today = startOfDay(Date.now());
    const cols: { ts: number; s: number; c: number; future: boolean }[][] = [];
    const months: { i: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const col = [];
      const weekStart = addDays(first, w * 7);
      const m = new Date(weekStart).getMonth();
      if (m !== lastMonth) {
        months.push({ i: w, label: fmtDate(weekStart, { month: 'short' }) });
        lastMonth = m;
      }
      for (let d = 0; d < 7; d++) {
        const ts = addDays(weekStart, d);
        const v = counts.get(dayKey(ts));
        col.push({ ts, s: v?.s ?? 0, c: v?.c ?? 0, future: ts > today });
      }
      cols.push(col);
    }
    return { cols, months };
  }, [workouts, cardioDays]);

  return (
    <Card className="p-4">
      <div className="relative mb-1 ml-6 h-4 text-[10px] text-muted">
        {months.map((m) => (
          <span key={m.i} className="absolute" style={{ left: `${(m.i / WEEKS) * 100}%` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <div className="grid w-5 grid-rows-7 gap-[3px] text-[9px] leading-none text-muted">
          {['Mo', '', 'Mi', '', 'Fr', '', 'So'].map((l, i) => (
            <span key={i} className="flex items-center">
              {l}
            </span>
          ))}
        </div>
        <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
          {cols.map((col, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-[3px]">
              {col.map((d) => (
                <motion.div
                  key={d.ts}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: ci * 0.015 }}
                  title={fmtDate(d.ts)}
                  className={cx(
                    'aspect-square rounded-[4px]',
                    d.future
                      ? 'bg-transparent'
                      : d.s >= 2
                        ? 'bg-accent'
                        : d.s === 1
                          ? d.c
                            ? 'bg-accent shadow-[inset_0_0_0_2px_#4da3ff]'
                            : 'bg-accent/80'
                          : d.c
                            ? 'bg-[#4da3ff]/70'
                            : 'bg-surface-3',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-accent/80" /> Kraft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#4da3ff]/70" /> Cardio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-3" /> Pause
        </span>
      </div>
    </Card>
  );
}

function MuscleWeek({ workouts, exMap, bw }: { workouts: Workout[]; exMap: Map<string, Exercise>; bw: number }) {
  const [offset, setOffset] = useState(0);
  const [metric, setMetric] = useState<'sets' | 'kg'>('sets');
  const from = addDays(startOfWeek(Date.now()), -7 * offset);
  const to = addDays(from, 7);
  const vol = useMemo(() => muscleVolume(workouts, exMap, bw, from, to), [workouts, exMap, bw, from, to]);
  const prevVol = useMemo(() => muscleVolume(workouts, exMap, bw, addDays(from, -7), from), [workouts, exMap, bw, from]);
  const rows = MUSCLES.map((m) => ({ m, v: vol.get(m)?.[metric] ?? 0, p: prevVol.get(m)?.[metric] ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => Math.max(r.v, r.p)));
  const total = rows.reduce((a, r) => a + r.v, 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setOffset(offset + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2" aria-label="Vorherige Woche">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold">{offset === 0 ? 'Diese Woche' : offset === 1 ? 'Letzte Woche' : `KW ab ${fmtDateShort(from)}`}</div>
          <div className="text-xs text-muted tabular">
            {fmtDateShort(from)} – {fmtDateShort(addDays(to, -1))} · {metric === 'sets' ? `${total} Sätze` : `${fmt0(total)} kg`}
          </div>
        </div>
        <button
          onClick={() => setOffset(Math.max(0, offset - 1))}
          disabled={offset === 0}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 disabled:opacity-30"
          aria-label="Nächste Woche"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <Segmented
        id="muscle-metric"
        value={metric}
        onChange={setMetric}
        options={[
          { value: 'sets', label: 'Sätze' },
          { value: 'kg', label: 'Volumen (kg)' },
        ]}
      />
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.m} className="grid grid-cols-[86px_1fr_52px] items-center gap-2">
            <span className="truncate text-[13px] text-zinc-300">{r.m}</span>
            <div className="relative h-3.5 overflow-hidden rounded-full bg-surface-2">
              <div className="absolute inset-y-0 left-0 rounded-full bg-zinc-600/50" style={{ width: `${(r.p / max) * 100}%` }} />
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(r.v / max) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-right text-[13px] font-semibold tabular">{metric === 'sets' ? r.v : fmt0(r.v)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">Grauer Balken = Vorwoche · nur Arbeitssätze</p>
    </Card>
  );
}

function ExerciseProgress({ workouts, exMap, bw }: { workouts: Workout[]; exMap: Map<string, Exercise>; bw: number }) {
  const options = useMemo(() => {
    const count = new Map<string, number>();
    for (const w of workouts) for (const e of w.exercises) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1);
    return [...count.entries()]
      .filter(([id]) => exMap.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => exMap.get(id)!);
  }, [workouts, exMap]);
  const [sel, setSel] = useState<string | null>(null);
  const ex = exMap.get(sel ?? '') ?? options[0];
  const series = useMemo(() => (ex ? exerciseSeries(workouts, ex, bw) : []), [workouts, ex, bw]);

  if (!ex) return <Card className="p-6 text-center text-sm text-muted">Noch keine Übungsdaten.</Card>;

  const isTime = ex.measure === 'time';
  const isBw = ex.measure === 'bodyweight';
  const data = series.map((p) => ({ label: fmtDateShort(p.date), top: p.top, e1rm: p.e1rm }));
  const bestTop = series.length ? Math.max(...series.map((p) => p.top)) : 0;
  const bestE = series.length ? Math.max(...series.map((p) => p.e1rm ?? 0)) : 0;
  const allSets = workouts.flatMap((w) => w.exercises.filter((e) => e.exerciseId === ex.id).flatMap((e) => e.sets.filter((s) => s.done && !s.warmup)));
  const maxReps = allSets.length ? Math.max(...allSets.map((s) => s.reps)) : 0;
  const first = series[0];
  const last = series.at(-1);
  const gain = first && last && first.e1rm && last.e1rm ? last.e1rm - first.e1rm : null;

  return (
    <Card className="p-4">
      <select value={ex.id} onChange={(e) => setSel(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] font-semibold outline-none">
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <PRTile label={isTime ? 'Längste Zeit' : isBw ? 'Max. Zusatz' : 'Top-Gewicht'} value={isTime ? `${bestTop} s` : `${fmt(bestTop)} kg`} />
        {!isTime && <PRTile label="Bestes 1RM" value={`${fmt1(bestE)} kg`} />}
        <PRTile label={isTime ? 'Einheiten' : 'Max. Wdh.'} value={isTime ? String(series.length) : String(maxReps)} />
        {isTime && <PRTile label="Trainings" value={String(series.length)} />}
      </div>

      <div className="mt-4 h-60">
        {data.length < 2 ? (
          <p className="pt-20 text-center text-sm text-muted">Ab 2 Trainings siehst du hier deinen Verlauf.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={CHART.tick} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={CHART.tick} tickLine={false} axisLine={false} width={44} domain={['dataMin - 5', 'dataMax + 5']} tickFormatter={(v: number) => fmt0(v)} />
              <Tooltip content={<ChartTooltip unit={isTime ? 's' : 'kg'} />} cursor={{ stroke: '#3a3b37' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#8d8f88', paddingTop: 6 }} />
              <Line
                type="monotone"
                dataKey="top"
                name={isTime ? 'Längste Zeit' : isBw ? 'Zusatzgewicht' : 'Top-Satz'}
                stroke="#c8f53c"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#c8f53c', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                animationDuration={800}
              />
              {!isTime && (
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  name="Geschätztes 1RM"
                  stroke="#4da3ff"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2.5, fill: '#4da3ff', strokeWidth: 0 }}
                  animationDuration={800}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {gain !== null && series.length >= 2 && (
        <p className="mt-2 text-center text-sm text-muted">
          1RM seit {fmtDateShort(first!.date)}:{' '}
          <span className={gain >= 0 ? 'font-semibold text-accent' : 'font-semibold text-danger'}>
            {gain >= 0 ? '+' : ''}
            {fmt1(gain)} kg
          </span>
        </p>
      )}
    </Card>
  );
}

function PRTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className="text-[17px] font-bold tabular">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
