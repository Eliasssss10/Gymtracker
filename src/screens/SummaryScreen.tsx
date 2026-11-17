import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, Dumbbell, Layers, Minus, Trash2, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../store';
import { useExerciseMap, useWorkouts } from '../hooks/data';
import { workoutPRs, PR_LABEL, epley, loadOf } from '../lib/records';
import { workingSets } from '../lib/progression';
import { workoutStats } from '../lib/stats';
import { fmt, fmt0, fmt1, fmtDate, fmtDateShort, fmtSets, fmtTime } from '../lib/format';
import { fireConfetti } from '../lib/feedback';
import { AnimatedNumber, Btn, Card, Confirm, ListSkeleton, ScreenHeader, SectionTitle, inputCls } from '../components/ui';

export function SummaryScreen({ workoutId, mode }: { workoutId: string; mode: 'summary' | 'detail' }) {
  const w = useLiveQuery(async () => (await db.workouts.get(workoutId)) ?? null, [workoutId]);
  const all = useWorkouts();
  const exMap = useExerciseMap();
  const bw = useApp((s) => s.settings.bodyweight);
  const pop = useApp((s) => s.pop);
  const showToast = useApp((s) => s.showToast);
  const [del, setDel] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fired = useRef(false);

  const data = useMemo(() => {
    if (!w || !all || !exMap) return null;
    const stats = workoutStats(w, exMap, bw);
    const prs = workoutPRs(w, all, exMap, bw);
    const prev = all.find((x) => x.dayId === w.dayId && x.startedAt < w.startedAt && x.id !== w.id);
    return { stats, prs, prev, prevStats: prev ? workoutStats(prev, exMap, bw) : null };
  }, [w, all, exMap, bw]);

  useEffect(() => {
    if (mode === 'summary' && data && data.prs.length && !fired.current) {
      fired.current = true;
      setTimeout(fireConfetti, 500);
    }
  }, [mode, data]);

  if (w === null) {
    return (
      <>
        <ScreenHeader title="Training" onBack={pop} />
        <p className="p-8 text-center text-muted">Training nicht gefunden.</p>
      </>
    );
  }
  if (!w || !data || !exMap) {
    return (
      <>
        <ScreenHeader title="Training" onBack={pop} />
        <div className="pt-4">
          <ListSkeleton />
        </div>
      </>
    );
  }

  const { stats, prs, prev, prevStats } = data;
  const isSummary = mode === 'summary';

  return (
    <div className="pb-16">
      {isSummary ? (
        <div className="pt-safe px-5 pt-10 text-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_0_60px_rgba(200,245,60,0.35)]"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.4 }} />
            </svg>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-5 text-[30px] font-extrabold tracking-tight">
            {prs.length ? 'Neue Rekorde!' : 'Stark gemacht!'}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1 text-muted">
            {w.dayName} · {fmtDate(w.startedAt, { weekday: 'long', day: 'numeric', month: 'long' })}
          </motion.p>
        </div>
      ) : (
        <ScreenHeader
          title={w.dayName}
          sub={`${fmtDate(w.startedAt, { weekday: 'short', day: 'numeric', month: 'long' })} · ${fmtTime(w.startedAt)}`}
          onBack={pop}
          right={
            <button onClick={() => setDel(true)} className="grid h-10 w-10 place-items-center text-danger" aria-label="Löschen">
              <Trash2 size={20} />
            </button>
          }
        />
      )}

      <div className="px-4">
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <Tile i={0} icon={<Clock size={16} />} label="Dauer">
            <AnimatedNumber value={Math.round(stats.duration / 60)} /> <span className="text-[17px] text-muted">min</span>
          </Tile>
          <Tile i={1} icon={<Dumbbell size={16} />} label="Volumen">
            <AnimatedNumber value={stats.volume} /> <span className="text-[17px] text-muted">kg</span>
          </Tile>
          <Tile i={2} icon={<Layers size={16} />} label="Sätze">
            <AnimatedNumber value={stats.sets} />
          </Tile>
          <Tile i={3} icon={<Trophy size={16} className="text-pr" />} label="Rekorde" highlight={prs.length > 0}>
            <AnimatedNumber value={prs.length} />
          </Tile>
        </div>

        {prevStats && prev && (
          <>
            <SectionTitle>Vergleich zu {prev.dayName} am {fmtDateShort(prev.startedAt)}</SectionTitle>
            <Card className="divide-y divide-line/60">
              <Delta label="Volumen" cur={stats.volume} prev={prevStats.volume} fmtV={(v) => `${fmt0(v)} kg`} pct />
              <Delta label="Sätze" cur={stats.sets} prev={prevStats.sets} fmtV={(v) => fmt0(v)} />
              <Delta label="Dauer" cur={stats.duration / 60} prev={prevStats.duration / 60} fmtV={(v) => `${fmt0(v)} min`} neutral />
            </Card>
          </>
        )}

        {prs.length > 0 && (
          <>
            <SectionTitle>Persönliche Rekorde</SectionTitle>
            <div className="flex flex-col gap-2">
              {prs.map((p, i) => {
                const ex = exMap.get(p.exerciseId);
                if (!ex) return null;
                const val =
                  p.type === 'e1rm'
                    ? `${fmt1(p.value)} kg`
                    : p.type === 'weight'
                      ? `${fmt(p.weight)} kg × ${p.reps}`
                      : p.type === 'time'
                        ? `${p.reps} s`
                        : `${p.reps} × ${ex.measure === 'bodyweight' ? (p.weight ? `+${fmt(p.weight)} kg` : 'KG') : `${fmt(p.weight)} kg`}`;
                return (
                  <motion.div
                    key={`${p.exerciseId}-${p.type}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.07 }}
                    className="flex items-center gap-3 rounded-2xl border border-pr/25 bg-pr/8 px-4 py-3"
                  >
                    <Trophy size={20} className="shrink-0 text-pr" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{ex.name}</div>
                      <div className="text-xs text-pr/80">{PR_LABEL[p.type]}</div>
                    </div>
                    <div className="text-[15px] font-bold tabular">{val}</div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <SectionTitle>Übungen</SectionTitle>
        <Card className="divide-y divide-line/60">
          {w.exercises.map((e) => {
            const ex = exMap.get(e.exerciseId);
            if (!ex) return null;
            const ws = workingSets(e.sets);
            const best = ex.measure === 'time' ? 0 : Math.max(0, ...ws.map((s) => epley(loadOf(ex.measure, s.weight, bw), s.reps)));
            const warm = e.sets.filter((s) => s.warmup && s.done).length;
            return (
              <div key={e.uid} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold">{ex.name}</span>
                  {best > 0 && <span className="shrink-0 text-xs text-muted">1RM ≈ {fmt1(best)} kg</span>}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {fmtSets(ex, ws)}
                  {warm > 0 && ` · ${warm} Aufwärm`}
                </div>
              </div>
            );
          })}
        </Card>

        <SectionTitle>Notiz</SectionTitle>
        <textarea
          value={note ?? w.note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== null && db.workouts.update(w.id, { note })}
          rows={3}
          placeholder="Wie lief's?"
          className={`${inputCls} h-auto resize-none bg-surface py-3`}
        />

        {isSummary && (
          <Btn className="mt-6 h-14 w-full text-[17px]" onClick={pop}>
            Fertig
          </Btn>
        )}
      </div>

      <Confirm
        open={del}
        onClose={() => setDel(false)}
        title="Training löschen?"
        text="Das Training wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        danger
        onConfirm={async () => {
          await db.workouts.delete(w.id);
          pop();
          showToast('Training gelöscht');
        }}
      />
    </div>
  );
}

function Tile({ icon, label, children, i, highlight }: { icon: ReactNode; label: string; children: ReactNode; i: number; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-3xl border p-4 ${highlight ? 'border-pr/30 bg-pr/8' : 'border-line/60 bg-surface'}`}
    >
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        {icon} {label}
      </div>
      <div className="mt-1.5 text-[30px] font-bold leading-none">{children}</div>
    </motion.div>
  );
}

function Delta({ label, cur, prev, fmtV, pct, neutral }: { label: string; cur: number; prev: number; fmtV: (v: number) => string; pct?: boolean; neutral?: boolean }) {
  const d = cur - prev;
  const up = d > 0.0001;
  const down = d < -0.0001;
  const color = neutral || (!up && !down) ? 'text-muted' : up ? 'text-accent' : 'text-danger';
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const diff = pct && prev > 0 ? `${up ? '+' : ''}${fmt1((d / prev) * 100)} %` : `${up ? '+' : ''}${fmtV(d)}`;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[15px]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted tabular">
          {fmtV(prev)} → <span className="text-zinc-100">{fmtV(cur)}</span>
        </span>
        <span className={`flex min-w-[72px] items-center justify-end gap-1 text-sm font-semibold tabular ${color}`}>
          <Icon size={15} /> {diff}
        </span>
      </div>
    </div>
  );
}
