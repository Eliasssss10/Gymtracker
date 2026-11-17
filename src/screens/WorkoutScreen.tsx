import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Disc3, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { useExerciseMap, useNow, useWorkouts } from '../hooks/data';
import { finishActive } from '../db/repo';
import { defaultRange, makeWorkoutExercise } from '../lib/build';
import { fmtClock } from '../lib/format';
import { haptic } from '../lib/feedback';
import { ExerciseCard } from '../components/ExerciseCard';
import { ExercisePicker } from '../components/ExercisePicker';
import { PlateCalculator } from '../components/PlateCalculator';
import { Btn, Confirm, IconBtn, Skeleton, inputCls } from '../components/ui';

function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return <span className="tabular">{fmtClock((now - since) / 1000)}</span>;
}

export function WorkoutScreen() {
  const active = useApp((s) => s.active);
  const pop = useApp((s) => s.pop);
  const replaceTop = useApp((s) => s.replaceTop);
  const setActive = useApp((s) => s.setActive);
  const mutateActive = useApp((s) => s.mutateActive);
  const stopRest = useApp((s) => s.stopRest);
  const showToast = useApp((s) => s.showToast);
  const exMap = useExerciseMap();
  const history = useWorkouts();

  const [confirm, setConfirm] = useState<null | 'finish' | 'discard'>(null);
  const [picker, setPicker] = useState(false);
  const [plates, setPlates] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  if (!active) {
    return (
      <div className="pt-safe grid min-h-dvh place-items-center p-8 text-center text-muted">
        <div>
          Kein laufendes Training.
          <Btn variant="secondary" className="mt-4 w-full" onClick={pop}>
            Zurück
          </Btn>
        </div>
      </div>
    );
  }

  const total = active.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  const finish = async () => {
    const w = useApp.getState().active;
    if (!w || saving) return;
    if (!w.exercises.some((e) => e.sets.some((s) => s.done))) {
      discard();
      return;
    }
    setSaving(true);
    const saved = await finishActive(w);
    useApp.setState({ active: null });
    stopRest();
    haptic('success');
    replaceTop({ name: 'summary', workoutId: saved.id });
  };

  const discard = () => {
    setActive(null);
    stopRest();
    pop();
    showToast('Training verworfen');
  };

  const addExercise = (exId: string) => {
    const ex = exMap?.get(exId);
    if (!ex || !history) return;
    const occurrence = active.exercises.filter((e) => e.exerciseId === exId).length;
    const we = makeWorkoutExercise(ex, { sets: 3, ...defaultRange(ex.kind, ex.measure) }, history, occurrence);
    mutateActive((w) => {
      w.exercises.push(we);
    });
  };

  const occ = new Map<string, number>();

  return (
    <div className="pb-44">
      <div className="pt-safe sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-2">
          <IconBtn onClick={pop} aria-label="Minimieren">
            <ChevronDown size={26} />
          </IconBtn>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: active.dayColor ?? '#c8f53c' }} />
              <span className="truncate text-[17px] font-bold">{active.dayName}</span>
            </div>
            <div className="text-xs text-muted">
              <Elapsed since={active.startedAt} /> · {done}/{total} Sätze
            </div>
          </div>
          <IconBtn aria-label="Hantelscheiben" onClick={() => setPlates(60)}>
            <Disc3 size={20} />
          </IconBtn>
          <Btn className="h-10 rounded-xl px-4 text-[15px]" onClick={() => setConfirm('finish')}>
            Beenden
          </Btn>
        </div>
        <div className="h-[3px] w-full bg-surface-2">
          <motion.div
            className="h-full bg-accent"
            initial={false}
            animate={{ width: `${total ? (done / total) * 100 : 0}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-3 pt-3">
        {!exMap || !history ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : (
          active.exercises.map((we) => {
            const o = occ.get(we.exerciseId) ?? 0;
            occ.set(we.exerciseId, o + 1);
            const ex = exMap.get(we.exerciseId);
            if (!ex) return null;
            return (
              <ExerciseCard key={we.uid} we={we} ex={ex} history={history} occurrence={o} onPlates={(w) => setPlates(w)} />
            );
          })
        )}

        <Btn variant="secondary" className="h-14" onClick={() => setPicker(true)}>
          <Plus size={20} /> Übung hinzufügen
        </Btn>

        <textarea
          value={active.note}
          onChange={(e) => {
            const v = e.target.value;
            mutateActive((w) => {
              w.note = v;
            });
          }}
          rows={3}
          placeholder="Notiz zum Training (Schlaf, Energie, Schmerzen …)"
          className={`${inputCls} h-auto resize-none bg-surface py-3`}
        />

        <Btn className="h-14 text-[17px]" onClick={() => setConfirm('finish')}>
          Training beenden
        </Btn>
        <Btn variant="ghost" className="text-danger" onClick={() => setConfirm('discard')}>
          <Trash2 size={18} /> Training verwerfen
        </Btn>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(e) => addExercise(e.id)} />
      <PlateCalculator open={plates !== null} onClose={() => setPlates(null)} initial={plates ?? 60} />
      <Confirm
        open={confirm === 'finish'}
        onClose={() => setConfirm(null)}
        title="Training beenden?"
        text={
          done === 0
            ? 'Du hast noch keinen Satz abgehakt – das Training wird verworfen.'
            : total - done > 0
              ? `${total - done} ${total - done === 1 ? 'Satz ist' : 'Sätze sind'} nicht abgehakt und werden nicht gespeichert.`
              : 'Stark! Alle Sätze erledigt.'
        }
        confirmLabel={done === 0 ? 'Verwerfen' : 'Beenden & speichern'}
        danger={done === 0}
        onConfirm={finish}
      />
      <Confirm
        open={confirm === 'discard'}
        onClose={() => setConfirm(null)}
        title="Training verwerfen?"
        text="Alle Einträge dieses Trainings gehen verloren."
        confirmLabel="Verwerfen"
        danger
        onConfirm={discard}
      />
    </div>
  );
}
