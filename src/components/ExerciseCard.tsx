import { memo, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Copy, Disc3, Ellipsis, Flame, Plus, StickyNote, Trash2, Trophy } from 'lucide-react';
import type { Exercise, SetEntry, Workout, WorkoutExercise } from '../types';
import { useApp } from '../store';
import { db } from '../db/db';
import { findLastPerformance, suggest } from '../lib/progression';
import { detectPRs, historySets, PR_LABEL, type PRType } from '../lib/records';
import { fmt, fmtAgo, fmtSets, fmtWeight, round2 } from '../lib/format';
import { fireConfetti, haptic, unlockAudio } from '../lib/feedback';
import { uid } from '../lib/uid';
import { SET_GRID, SetRow } from './SetRow';
import { Btn, IconBtn, Sheet, SheetAction, inputCls } from './ui';

interface Props {
  we: WorkoutExercise;
  ex: Exercise;
  history: Workout[];
  occurrence: number;
  onPlates: (weight: number) => void;
}

export const ExerciseCard = memo(function ExerciseCard({ we, ex, history, occurrence, onPlates }: Props) {
  const settings = useApp((s) => s.settings);
  const mut = useApp((s) => s.mutateActive);
  const startRest = useApp((s) => s.startRest);
  const showToast = useApp((s) => s.showToast);
  const bw = settings.bodyweight;

  const [menu, setMenu] = useState(false);
  const [setMenuFor, setSetMenuFor] = useState<SetEntry | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(ex.note ?? '');

  const last = useMemo(() => findLastPerformance(history, ex.id, occurrence), [history, ex.id, occurrence]);
  const sug = useMemo(
    () => suggest(ex, { sets: we.plannedSets, repMin: we.repMin, repMax: we.repMax }, last?.sets),
    [ex, we.plannedSets, we.repMin, we.repMax, last],
  );
  const prior = useMemo(() => historySets(history, ex.id), [history, ex.id]);

  const prMap = useMemo(() => {
    const acc = [...prior];
    const m = new Map<string, PRType[]>();
    for (const s of we.sets) {
      if (!s.done || s.warmup) continue;
      m.set(s.id, detectPRs(s, acc, ex.measure, bw));
      acc.push(s);
    }
    return m;
  }, [we.sets, prior, ex.measure, bw]);

  const labels = useMemo(() => {
    let n = 0;
    return we.sets.map((s) => (s.warmup ? 'W' : String(++n)));
  }, [we.sets]);

  const edit = useCallback(
    (fn: (e: WorkoutExercise) => void) =>
      mut((w) => {
        const e = w.exercises.find((x) => x.uid === we.uid);
        if (e) fn(e);
      }),
    [mut, we.uid],
  );

  const onPatch = useCallback(
    (id: string, p: Partial<SetEntry>) =>
      edit((e) => {
        const s = e.sets.find((x) => x.id === id);
        if (s) Object.assign(s, p);
      }),
    [edit],
  );

  const onToggle = useCallback(
    (s: SetEntry) => {
      const done = !s.done;
      edit((e) => {
        const t = e.sets.find((x) => x.id === s.id);
        if (!t) return;
        t.done = done;
        if (done) t.doneAt = Date.now();
        else delete t.doneAt;
      });
      if (!done) {
        haptic('light');
        return;
      }
      unlockAudio();
      const rest = s.warmup
        ? settings.restWarmup
        : (we.restSec ?? (ex.kind === 'compound' ? settings.restCompound : settings.restIsolation));
      startRest(rest, ex.name);
      if (!s.warmup && s.reps > 0) {
        const others = we.sets.filter((x) => x.id !== s.id && x.done && !x.warmup);
        const prs = detectPRs(s, [...prior, ...others], ex.measure, bw);
        if (prs.length) {
          haptic('success');
          fireConfetti();
          showToast(`Neuer Rekord: ${prs.map((p) => PR_LABEL[p]).join(' · ')}`, { tone: 'pr' });
          return;
        }
      }
      haptic('light');
    },
    [edit, settings, we.restSec, we.sets, ex, startRest, prior, bw, showToast],
  );

  const onDelete = useCallback(
    (s: SetEntry) => {
      const idx = we.sets.findIndex((x) => x.id === s.id);
      edit((e) => {
        e.sets = e.sets.filter((x) => x.id !== s.id);
      });
      haptic('light');
      showToast('Satz gelöscht', {
        action: {
          label: 'Rückgängig',
          run: () =>
            edit((e) => {
              e.sets.splice(Math.min(idx, e.sets.length), 0, s);
            }),
        },
      });
    },
    [edit, we.sets, showToast],
  );

  const onMenu = useCallback((s: SetEntry) => setSetMenuFor(s), []);

  const addSet = () => {
    const lastSet = [...we.sets].reverse().find((x) => !x.warmup);
    const idx = we.sets.filter((x) => !x.warmup).length;
    const base = lastSet ?? { weight: sug.weight, reps: sug.targets[0] ?? we.repMin };
    edit((e) => {
      e.sets.push({ id: uid(), weight: base.weight, reps: sug.targets[idx] ?? base.reps, done: false, warmup: false });
    });
    haptic('light');
  };

  const addWarmup = () => {
    const work = we.sets.find((x) => !x.warmup)?.weight ?? sug.weight;
    const w = Math.max(0, Math.round((work * 0.5) / 2.5) * 2.5);
    edit((e) => {
      const firstWork = e.sets.findIndex((x) => !x.warmup);
      e.sets.splice(firstWork < 0 ? e.sets.length : firstWork, 0, { id: uid(), weight: w, reps: 10, done: false, warmup: true });
    });
    setMenu(false);
  };

  const removeExercise = () => {
    setMenu(false);
    let snapshot: WorkoutExercise | null = null;
    let index = 0;
    mut((w) => {
      index = w.exercises.findIndex((x) => x.uid === we.uid);
      snapshot = w.exercises[index] ? JSON.parse(JSON.stringify(w.exercises[index])) : null;
      w.exercises = w.exercises.filter((x) => x.uid !== we.uid);
    });
    showToast(`${ex.name} entfernt`, {
      action: {
        label: 'Rückgängig',
        run: () => mut((w) => void (snapshot && w.exercises.splice(index, 0, snapshot))),
      },
    });
  };

  const saveNote = async () => {
    await db.exercises.update(ex.id, { note: note.trim() });
    setNoteOpen(false);
  };

  const isTime = ex.measure === 'time';
  const unit = isTime ? 's' : 'Wdh.';
  const doneCount = we.sets.filter((s) => s.done && !s.warmup).length;
  const workCount = we.sets.filter((s) => !s.warmup).length;
  const allDone = workCount > 0 && doneCount === workCount;

  let target: string;
  if (sug.status === 'new') target = `Erstes Mal – Ziel ${we.repMin}–${we.repMax} ${unit}`;
  else if (sug.status === 'increase')
    target = isTime
      ? `Alle Sätze am Limit → Ziel ${sug.targets.join(' · ')} s`
      : `Alle Sätze ${we.repMax}+ geschafft → ${fmtWeight(ex, sug.weight)} × ${we.repMin}+`;
  else target = `Ziel: ${sug.targets.join(' · ')} ${unit}${isTime ? '' : ` mit ${fmtWeight(ex, sug.weight)}`}`;

  return (
    <motion.div
      layout="position"
      className={`rounded-[26px] border p-2.5 transition-colors duration-300 ${allDone ? 'border-accent/30 bg-surface' : 'border-line/60 bg-surface'}`}
    >
      <div className="flex items-start gap-2 px-1.5 pt-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-bold leading-tight">{ex.name}</h3>
            <AnimatePresence>
              {sug.status === 'increase' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[12px] font-bold text-accent-ink"
                >
                  <motion.span
                    animate={{ y: [0, -2.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                    className="inline-flex"
                  >
                    <ArrowUp size={13} strokeWidth={3} />
                  </motion.span>
                  Steigern!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {last ? (
              <>
                Letztes Mal: {fmtSets(ex, last.sets)} <span className="opacity-70">· {fmtAgo(last.date)}</span>
              </>
            ) : (
              'Noch keine Daten'
            )}
          </p>
          <p className={`mt-0.5 text-[13px] font-medium ${sug.status === 'increase' ? 'text-accent' : 'text-zinc-300'}`}>{target}</p>
        </div>
        <div className="flex items-center">
          {ex.barbell && (
            <IconBtn
              aria-label="Hantelscheiben"
              onClick={() => onPlates(we.sets.find((s) => !s.done && !s.warmup)?.weight ?? sug.weight)}
            >
              <Disc3 size={20} />
            </IconBtn>
          )}
          <IconBtn aria-label="Übungsmenü" onClick={() => setMenu(true)}>
            <Ellipsis size={22} />
          </IconBtn>
        </div>
      </div>

      {ex.note && (
        <button
          onClick={() => {
            setNote(ex.note ?? '');
            setNoteOpen(true);
          }}
          className="mx-1.5 mt-2 flex items-start gap-1.5 rounded-xl bg-pr/8 px-2.5 py-1.5 text-left text-[13px] text-pr/90"
        >
          <StickyNote size={14} className="mt-0.5 shrink-0" />
          {ex.note}
        </button>
      )}

      <div className={`${SET_GRID} mt-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted`}>
        <span className="text-center">Satz</span>
        {isTime ? (
          <span className="col-span-2 text-center">Zeit</span>
        ) : (
          <>
            <span className="text-center">{ex.measure === 'bodyweight' ? '+ kg' : 'kg'}</span>
            <span className="text-center">Wdh.</span>
          </>
        )}
        <span className="text-center">✓</span>
      </div>

      <div className="mt-1 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {we.sets.map((s, i) => (
            <SetRow
              key={s.id}
              set={s}
              label={labels[i]}
              measure={ex.measure}
              weightStep={settings.weightStep}
              prs={prMap.get(s.id)}
              onPatch={onPatch}
              onToggle={onToggle}
              onDelete={onDelete}
              onMenu={onMenu}
            />
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={addSet}
        className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-[14px] font-semibold text-zinc-300"
      >
        <Plus size={17} /> Satz hinzufügen
      </motion.button>

      {/* Übungsmenü */}
      <Sheet open={menu} onClose={() => setMenu(false)} title={ex.name}>
        <div className="flex flex-col gap-2">
          <SheetAction icon={<Flame size={20} className="text-pr" />} onClick={addWarmup}>
            Aufwärmsatz hinzufügen
          </SheetAction>
          <SheetAction
            icon={<StickyNote size={20} />}
            onClick={() => {
              setMenu(false);
              setNote(ex.note ?? '');
              setNoteOpen(true);
            }}
          >
            {ex.note ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
          </SheetAction>
          {!isTime && (
            <SheetAction
              icon={<Disc3 size={20} />}
              onClick={() => {
                setMenu(false);
                onPlates(we.sets.find((s) => !s.done && !s.warmup)?.weight ?? sug.weight);
              }}
            >
              Hantelscheiben-Rechner
            </SheetAction>
          )}
          <SheetAction danger icon={<Trash2 size={20} />} onClick={removeExercise}>
            Übung aus diesem Training entfernen
          </SheetAction>
        </div>
      </Sheet>

      {/* Satzmenü */}
      <Sheet
        open={!!setMenuFor}
        onClose={() => setSetMenuFor(null)}
        title={setMenuFor ? (setMenuFor.warmup ? 'Aufwärmsatz' : `Satz ${labels[we.sets.findIndex((x) => x.id === setMenuFor.id)] ?? ''}`) : ''}
      >
        {setMenuFor && (
          <div className="flex flex-col gap-2">
            <SheetAction
              icon={<Flame size={20} className="text-pr" />}
              onClick={() => {
                onPatch(setMenuFor.id, { warmup: !setMenuFor.warmup });
                setSetMenuFor(null);
              }}
            >
              {setMenuFor.warmup ? 'Als Arbeitssatz markieren' : 'Als Aufwärmsatz markieren'}
            </SheetAction>
            <SheetAction
              icon={<Copy size={20} />}
              onClick={() => {
                const s = setMenuFor;
                edit((e) => {
                  const i = e.sets.findIndex((x) => x.id === s.id);
                  e.sets.splice(i + 1, 0, { ...s, id: uid(), done: false, doneAt: undefined });
                });
                setSetMenuFor(null);
              }}
            >
              Satz duplizieren
            </SheetAction>
            <SheetAction
              danger
              icon={<Trash2 size={20} />}
              onClick={() => {
                const s = setMenuFor;
                setSetMenuFor(null);
                onDelete(s);
              }}
            >
              Satz löschen
            </SheetAction>
            {prMap.get(setMenuFor.id)?.length ? (
              <div className="mt-1 flex items-center gap-2 rounded-2xl bg-pr/10 px-4 py-3 text-sm text-pr">
                <Trophy size={16} /> {prMap.get(setMenuFor.id)!.map((p) => PR_LABEL[p]).join(' · ')}
              </div>
            ) : null}
          </div>
        )}
      </Sheet>

      {/* Notiz */}
      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title={`Notiz · ${ex.name}`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="z. B. Sitz Stufe 4, Griff eng …"
          className={`${inputCls} h-auto resize-none py-3`}
        />
        <p className="mt-2 px-1 text-xs text-muted">Die Notiz bleibt bei der Übung und erscheint bei jedem Training.</p>
        <Btn className="mt-4 w-full" onClick={saveNote}>
          Speichern
        </Btn>
      </Sheet>
    </motion.div>
  );
});

