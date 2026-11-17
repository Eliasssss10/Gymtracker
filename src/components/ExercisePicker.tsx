import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Exercise, ExerciseKind, MeasureType, Muscle } from '../types';
import { MUSCLES } from '../types';
import { db } from '../db/db';
import { useExercises } from '../hooks/data';
import { uid } from '../lib/uid';
import { Btn, Field, Segmented, Sheet, inputCls } from './ui';

export const KIND_OPTS: { value: ExerciseKind; label: string }[] = [
  { value: 'compound', label: 'Grundübung' },
  { value: 'isolation', label: 'Isolation' },
];
export const MEASURE_OPTS: { value: MeasureType; label: string }[] = [
  { value: 'weight', label: 'Gewicht' },
  { value: 'bodyweight', label: 'Körpergew.' },
  { value: 'time', label: 'Zeit' },
];

export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = 'Übung hinzufügen',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
  title?: string;
}) {
  const all = useExercises();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<ExerciseKind>('isolation');
  const [measure, setMeasure] = useState<MeasureType>('weight');
  const [muscle, setMuscle] = useState<Muscle>('Brust');

  const groups = useMemo(() => {
    const list = (all ?? [])
      .filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const m = new Map<string, Exercise[]>();
    for (const e of list) m.set(e.muscle, [...(m.get(e.muscle) ?? []), e]);
    return MUSCLES.filter((x) => m.has(x)).map((x) => [x, m.get(x)!] as const);
  }, [all, q]);

  const close = () => {
    setQ('');
    setCreating(false);
    onClose();
  };

  const create = async () => {
    const name = q.trim();
    if (!name) return;
    const ex: Exercise = {
      id: uid(),
      name,
      kind,
      measure,
      muscle,
      increment: kind === 'compound' ? 2.5 : 2,
      barbell: false,
      note: '',
    };
    await db.exercises.put(ex);
    onPick(ex);
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={creating ? 'Neue Übung' : title}>
      {!creating ? (
        <>
          <div className="relative mb-3">
            <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen …" className={`${inputCls} pl-11`} />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setCreating(true)}
            className="mb-3 flex h-12 w-full items-center gap-2 rounded-2xl border border-dashed border-accent/40 px-4 text-[15px] font-semibold text-accent"
          >
            <Plus size={18} /> {q.trim() ? `„${q.trim()}" neu anlegen` : 'Neue Übung anlegen'}
          </motion.button>
          <div className="flex min-h-[40dvh] flex-col gap-4">
            {groups.map(([m, list]) => (
              <div key={m}>
                <div className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">{m}</div>
                <div className="overflow-hidden rounded-2xl bg-surface-3/50">
                  {list.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        onPick(e);
                        close();
                      }}
                      className="flex h-12 w-full items-center justify-between border-b border-line/50 px-4 text-left text-[15px] last:border-0 active:bg-surface-3"
                    >
                      <span>{e.name}</span>
                      <span className="text-xs text-muted">{e.kind === 'compound' ? 'Grund' : 'Iso'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Name">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="z. B. Dips" className={inputCls} />
          </Field>
          <Field label="Art">
            <Segmented id="new-kind" value={kind} options={KIND_OPTS} onChange={setKind} />
          </Field>
          <Field label="Messart">
            <Segmented id="new-measure" value={measure} options={MEASURE_OPTS} onChange={setMeasure} />
          </Field>
          <Field label="Muskelgruppe">
            <select value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)} className={inputCls}>
              {MUSCLES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setCreating(false)}>
              Zurück
            </Btn>
            <Btn className="flex-1" disabled={!q.trim()} onClick={create}>
              Anlegen
            </Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}
