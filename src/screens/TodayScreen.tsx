import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowUp, Flame, Play, RotateCcw } from 'lucide-react';
import { useApp } from '../store';
import { useCardio, useDays, useExerciseMap, useWorkouts } from '../hooks/data';
import { buildWorkout, nextDay, rotationNext } from '../lib/build';
import { findLastPerformance, suggest } from '../lib/progression';
import { fmtAgo, fmtDate, fmtWeight, startOfWeek } from '../lib/format';
import { weekStreak } from '../lib/stats';
import { haptic, unlockAudio } from '../lib/feedback';
import { Btn, Card, PageHeader, Skeleton, cx } from '../components/ui';

export function TodayScreen() {
  const days = useDays();
  const workouts = useWorkouts();
  const cardio = useCardio();
  const exMap = useExerciseMap();
  const settings = useApp((s) => s.settings);
  const active = useApp((s) => s.active);
  const updateSettings = useApp((s) => s.updateSettings);
  const setActive = useApp((s) => s.setActive);
  const push = useApp((s) => s.push);

  const next = useMemo(
    () => (days && workouts ? nextDay(days, workouts, settings.nextDayId) : undefined),
    [days, workouts, settings.nextDayId],
  );
  const rotation = useMemo(() => (days && workouts ? rotationNext(days, workouts) : undefined), [days, workouts]);

  const preview = useMemo(() => {
    if (!next || !exMap || !workouts) return [];
    const occ = new Map<string, number>();
    return next.items.flatMap((item) => {
      const ex = exMap.get(item.exerciseId);
      if (!ex) return [];
      const o = occ.get(ex.id) ?? 0;
      occ.set(ex.id, o + 1);
      const last = findLastPerformance(workouts, ex.id, o);
      return [{ item, ex, sug: suggest(ex, item, last?.sets) }];
    });
  }, [next, exMap, workouts]);

  const header = <PageHeader title="Heute" sub={fmtDate(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })} />;

  if (!days || !workouts || !exMap || !cardio) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-3 px-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-80" />
        </div>
      </>
    );
  }

  const times = [...workouts.map((w) => w.startedAt), ...cardio.map((c) => c.date)];
  const thisWeek = times.filter((t) => t >= startOfWeek(Date.now())).length;
  const streak = weekStreak(times);
  const lastW = workouts[0];
  const increases = preview.filter((p) => p.sug.status === 'increase').length;

  const start = () => {
    if (!next) return;
    unlockAudio();
    haptic('success');
    setActive(buildWorkout(next, exMap, workouts));
    if (settings.nextDayId) updateSettings({ nextDayId: null });
    push({ name: 'workout' });
  };

  return (
    <>
      {header}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Wochen-Streak" value={String(streak)} icon={<Flame size={15} className="text-pr" />} />
          <Stat label="Diese Woche" value={String(thisWeek)} />
          <Stat label="Zuletzt" value={lastW ? fmtAgo(lastW.startedAt) : '–'} small />
        </div>

        {active ? (
          <Card className="mt-4 overflow-hidden p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-[13px] font-semibold uppercase tracking-wider text-accent">Training läuft</div>
            <div className="mt-1 text-[28px] font-bold">{active.dayName}</div>
            <p className="mt-1 text-sm text-muted">
              {active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)} von{' '}
              {active.exercises.reduce((a, e) => a + e.sets.length, 0)} Sätzen erledigt
            </p>
            <Btn className="mt-5 h-14 w-full text-[17px]" onClick={() => push({ name: 'workout' })}>
              <Play size={20} fill="currentColor" /> Training fortsetzen
            </Btn>
          </Card>
        ) : next ? (
          <Card className="relative mt-4 overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
              style={{ background: next.color }}
            />
            <div className="relative p-5 pb-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
                Nächstes Training
                {settings.nextDayId && (
                  <button
                    onClick={() => updateSettings({ nextDayId: null })}
                    className="flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] normal-case tracking-normal text-zinc-300"
                  >
                    <RotateCcw size={11} /> Rotation
                  </button>
                )}
              </div>
              <motion.div key={next.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mt-1 text-[40px] font-extrabold leading-none tracking-tight">
                {next.name}
              </motion.div>
              <p className="mt-2 text-sm text-muted">
                {preview.length} Übungen · {preview.reduce((a, p) => a + p.item.sets, 0)} Sätze
                {increases > 0 && (
                  <span className="text-accent">
                    {' '}
                    · {increases}× steigern
                  </span>
                )}
              </p>
            </div>

            <div className="no-scrollbar relative flex gap-2 overflow-x-auto px-5 pb-4">
              {days.map((d) => {
                const on = d.id === next.id;
                return (
                  <motion.button
                    key={d.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      haptic('light');
                      updateSettings({ nextDayId: d.id === rotation?.id ? null : d.id });
                    }}
                    className={cx(
                      'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors',
                      on ? 'bg-zinc-100 text-zinc-900' : 'bg-surface-3 text-zinc-300',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </motion.button>
                );
              })}
            </div>

            <ul className="relative border-t border-line/60">
              {preview.map(({ item, ex, sug }, i) => (
                <motion.li
                  key={item.uid}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="flex items-center gap-3 border-b border-line/40 px-5 py-3 last:border-0"
                >
                  <span className="w-5 text-center text-sm font-semibold text-muted tabular">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{ex.name}</div>
                    <div className="text-xs text-muted">
                      {item.sets} × {item.repMin}–{item.repMax}
                      {ex.measure === 'time' ? ' s' : ''}
                      {sug.status !== 'new' && ex.measure !== 'time' && ` · ${fmtWeight(ex, sug.weight)}`}
                    </div>
                  </div>
                  {sug.status === 'increase' && (
                    <span className="flex items-center gap-0.5 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                      <ArrowUp size={12} strokeWidth={3} /> {ex.measure === 'time' ? '+5 s' : `+${ex.increment} kg`}
                    </span>
                  )}
                </motion.li>
              ))}
            </ul>
            <div className="p-4">
              <Btn className="h-[60px] w-full text-[18px] shadow-[0_10px_40px_-10px_rgba(200,245,60,0.55)]" onClick={start}>
                <Play size={22} fill="currentColor" /> Training starten
              </Btn>
            </div>
          </Card>
        ) : (
          <Card className="mt-4 p-6 text-center text-muted">Lege im Tab „Plan" einen Trainingstag an.</Card>
        )}

        <Btn variant="secondary" className="mt-3 h-14 w-full" onClick={() => push({ name: 'cardio' })}>
          <Activity size={20} className="text-[#4da3ff]" /> Cardio eintragen
        </Btn>
      </div>
    </>
  );
}

function Stat({ label, value, icon, small }: { label: string; value: string; icon?: ReactNode; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface px-3 py-3">
      <div className={cx('flex items-center gap-1 font-bold tabular', small ? 'whitespace-nowrap text-[15px] leading-7' : 'text-[24px] leading-7')}>
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}
