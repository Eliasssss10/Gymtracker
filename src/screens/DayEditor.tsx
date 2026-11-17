import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { db } from '../db/db';
import { DAY_COLORS } from '../db/defaults';
import { useApp } from '../store';
import { useExerciseMap } from '../hooks/data';
import { defaultRange } from '../lib/build';
import { fmtClock } from '../lib/format';
import { haptic } from '../lib/feedback';
import { uid } from '../lib/uid';
import { MUSCLES, type Exercise, type Muscle, type PlanDay, type PlanItem } from '../types';
import { ExercisePicker, KIND_OPTS, MEASURE_OPTS } from '../components/ExercisePicker';
import { Btn, Confirm, Field, ListSkeleton, ScreenHeader, Segmented, Sheet, Stepper, Toggle, inputCls } from '../components/ui';

export function DayEditor({ dayId }: { dayId: string }) {
  const day = useLiveQuery(async () => (await db.days.get(dayId)) ?? null, [dayId]);
  const exMap = useExerciseMap();
  const pop = useApp((s) => s.pop);
  const showToast = useApp((s) => s.showToast);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [name, setName] = useState('');
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (day) {
      setItems(day.items);
      setName(day.name);
    }
  }, [day]);

  if (day === null) {
    return (
      <>
        <ScreenHeader title="Tag" onBack={pop} />
        <p className="p-8 text-center text-muted">Tag nicht gefunden.</p>
      </>
    );
  }
  if (!day || !exMap) {
    return (
      <>
        <ScreenHeader title="Tag" onBack={pop} />
        <div className="pt-4">
          <ListSkeleton />
        </div>
      </>
    );
  }

  const save = (patch: Partial<PlanDay>) => db.days.update(day.id, patch);
  const saveItems = (next: PlanItem[]) => {
    setItems(next);
    void save({ items: next });
  };

  const addItem = (ex: Exercise) => {
    saveItems([...items, { uid: uid(), exerciseId: ex.id, sets: 3, ...defaultRange(ex.kind, ex.measure), restSec: null }]);
    haptic('light');
  };

  const editItem = items.find((i) => i.uid === editing);
  const editEx = editItem ? exMap.get(editItem.exerciseId) : undefined;

  return (
    <div className="pb-16">
      <ScreenHeader
        title={name || 'Trainingstag'}
        onBack={pop}
        right={
          <button onClick={() => setDel(true)} className="grid h-10 w-10 place-items-center text-danger" aria-label="Tag löschen">
            <Trash2 size={20} />
          </button>
        }
      />
      <div className="px-4 pt-5">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && save({ name: name.trim() })} className={inputCls} />
        </Field>
        <div className="mt-4 flex gap-2.5 px-1">
          {DAY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => save({ color: c })}
              className="h-8 w-8 rounded-full transition-transform"
              style={{ background: c, boxShadow: day.color === c ? `0 0 0 3px var(--color-bg), 0 0 0 5px ${c}` : undefined }}
              aria-label={`Farbe ${c}`}
            />
          ))}
        </div>

        <h2 className="mt-7 mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">Übungen</h2>
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
          {items.map((it, i) => (
            <ItemRow
              key={it.uid}
              item={it}
              index={i}
              ex={exMap.get(it.exerciseId)}
              onOpen={() => setEditing(it.uid)}
              onDrop={() => void save({ items })}
            />
          ))}
        </Reorder.Group>
        {items.length === 0 && <p className="py-6 text-center text-sm text-muted">Noch keine Übungen.</p>}
        <Btn variant="secondary" className="mt-3 h-14 w-full" onClick={() => setPicker(true)}>
          <Plus size={20} /> Übung hinzufügen
        </Btn>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={addItem} />

      <Sheet open={!!editItem && !!editEx} onClose={() => setEditing(null)} title={editEx?.name}>
        {editItem && editEx && (
          <ItemEditor
            key={editItem.uid}
            item={editItem}
            ex={editEx}
            onItem={(p) => saveItems(items.map((x) => (x.uid === editItem.uid ? { ...x, ...p } : x)))}
            onRemove={() => {
              const removed = editItem;
              const idx = items.findIndex((x) => x.uid === removed.uid);
              setEditing(null);
              saveItems(items.filter((x) => x.uid !== removed.uid));
              showToast(`${editEx.name} entfernt`, {
                action: {
                  label: 'Rückgängig',
                  run: async () => {
                    const cur = (await db.days.get(day.id))?.items ?? [];
                    const next = [...cur];
                    next.splice(idx, 0, removed);
                    await db.days.update(day.id, { items: next });
                  },
                },
              });
            }}
          />
        )}
      </Sheet>

      <Confirm
        open={del}
        onClose={() => setDel(false)}
        title={`„${day.name}" löschen?`}
        text="Der Tag verschwindet aus dem Plan. Bisherige Trainings bleiben im Verlauf."
        confirmLabel="Tag löschen"
        danger
        onConfirm={async () => {
          await db.days.delete(day.id);
          pop();
          showToast('Tag gelöscht');
        }}
      />
    </div>
  );
}

function ItemRow({ item, index, ex, onOpen, onDrop }: { item: PlanItem; index: number; ex?: Exercise; onOpen: () => void; onDrop: () => void }) {
  const controls = useDragControls();
  const unit = ex?.measure === 'time' ? ' s' : '';
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
      className="flex items-center rounded-2xl border border-line/60 bg-surface pr-3"
    >
      <div
        className="grid h-16 w-11 shrink-0 touch-none place-items-center text-muted"
        onPointerDown={(e) => {
          haptic('light');
          controls.start(e);
        }}
      >
        <GripVertical size={20} />
      </div>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        <span className="w-4 text-sm font-semibold text-muted tabular">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{ex?.name ?? 'Unbekannte Übung'}</div>
          <div className="text-[13px] text-muted">
            {item.sets} × {item.repMin}–{item.repMax}
            {unit} · {ex?.kind === 'compound' ? 'Grundübung' : 'Isolation'}
            {item.restSec ? ` · Pause ${fmtClock(item.restSec)}` : ''}
          </div>
        </div>
        <ChevronRight size={18} className="text-muted" />
      </button>
    </Reorder.Item>
  );
}

function ItemEditor({ item, ex, onItem, onRemove }: { item: PlanItem; ex: Exercise; onItem: (p: Partial<PlanItem>) => void; onRemove: () => void }) {
  const settings = useApp((s) => s.settings);
  const [exName, setExName] = useState(ex.name);
  const [note, setNote] = useState(ex.note ?? '');
  const saveEx = (p: Partial<Exercise>) => db.exercises.update(ex.id, p);
  const isTime = ex.measure === 'time';
  const step = isTime ? 5 : 1;
  const defRest = ex.kind === 'compound' ? settings.restCompound : settings.restIsolation;

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name (gilt für alle Tage & den Verlauf)">
        <input value={exName} onChange={(e) => setExName(e.target.value)} onBlur={() => exName.trim() && saveEx({ name: exName.trim() })} className={inputCls} />
      </Field>
      <Field label="Art">
        <Segmented
          id="edit-kind"
          value={ex.kind}
          options={KIND_OPTS}
          onChange={(kind) => {
            void saveEx({ kind, increment: kind === 'compound' ? 2.5 : 2 });
            onItem(defaultRange(kind, ex.measure));
          }}
        />
      </Field>
      <Field label="Messart">
        <Segmented
          id="edit-measure"
          value={ex.measure}
          options={MEASURE_OPTS}
          onChange={(measure) => {
            void saveEx({ measure });
            onItem(defaultRange(ex.kind, measure));
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sätze">
          <Stepper value={item.sets} onChange={(v) => onItem({ sets: v })} min={1} max={12} />
        </Field>
        <Field label="Muskelgruppe">
          <select value={ex.muscle} onChange={(e) => saveEx({ muscle: e.target.value as Muscle })} className={`${inputCls} h-11`}>
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label={isTime ? 'Sekunden von' : 'Wdh. von'}>
          <Stepper value={item.repMin} onChange={(v) => onItem({ repMin: v, repMax: Math.max(v, item.repMax) })} step={step} min={1} />
        </Field>
        <Field label="bis">
          <Stepper value={item.repMax} onChange={(v) => onItem({ repMax: v, repMin: Math.min(v, item.repMin) })} step={step} min={1} />
        </Field>
        {!isTime && (
          <Field label="Steigerung (kg)">
            <Stepper value={ex.increment} onChange={(v) => saveEx({ increment: v })} step={0.5} min={0.5} max={20} decimal />
          </Field>
        )}
        <Field label="Pause">
          <Stepper
            value={item.restSec ?? defRest}
            onChange={(v) => onItem({ restSec: v === defRest ? null : v })}
            step={15}
            min={15}
            max={600}
            format={(v) => fmtClock(v)}
          />
        </Field>
      </div>
      {item.restSec == null && <p className="-mt-2 px-1 text-xs text-muted">Pause = Standard aus den Einstellungen</p>}

      {!isTime && (
        <div className="flex items-center justify-between rounded-2xl bg-surface-3/50 px-4 py-3">
          <div>
            <div className="text-[15px] font-medium">Langhantel</div>
            <div className="text-xs text-muted">Hantelscheiben-Rechner direkt an der Übung</div>
          </div>
          <Toggle label="Langhantel" on={!!ex.barbell} onChange={(v) => saveEx({ barbell: v })} />
        </div>
      )}

      <Field label="Notiz zur Übung">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => saveEx({ note: note.trim() })} rows={2} placeholder="z. B. Sitzhöhe 4" className={`${inputCls} h-auto resize-none py-3`} />
      </Field>

      <Btn variant="danger" onClick={onRemove}>
        <Trash2 size={18} /> Aus diesem Tag entfernen
      </Btn>
    </div>
  );
}
