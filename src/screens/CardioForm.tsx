import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../store';
import { CARDIO_DEVICES, CARDIO_MODES, type CardioSession } from '../types';
import { cardioDuration } from '../lib/stats';
import { fmtMinutes } from '../lib/format';
import { uid } from '../lib/uid';
import { haptic } from '../lib/feedback';
import { Btn, Confirm, Field, NumberField, ScreenHeader, Segmented, Stepper, inputCls } from '../components/ui';

const toLocalInput = (ts: number) => {
  const d = new Date(ts);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function Duration({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const m = Math.floor(value / 60);
  const s = value % 60;
  return (
    <div className="flex h-12 items-center gap-1 rounded-2xl border border-line bg-surface-3/60 px-3">
      <NumberField value={m} onChange={(v) => onChange(Math.max(0, v) * 60 + s)} emptyZero={false} className="w-12 text-[17px]" ariaLabel="Minuten" />
      <span className="text-sm text-muted">min</span>
      <NumberField value={s} onChange={(v) => onChange(m * 60 + Math.min(59, Math.max(0, v)))} emptyZero={false} className="w-12 text-[17px]" ariaLabel="Sekunden" />
      <span className="text-sm text-muted">s</span>
    </div>
  );
}

const blank = (): CardioSession => ({
  id: uid(),
  date: Date.now(),
  device: 'Rudergerät',
  mode: 'Intervalle',
  workSec: 60,
  restSec: 60,
  rounds: 8,
  meters: 0,
  kcal: 0,
  note: '',
});

export function CardioForm({ id }: { id?: string }) {
  const pop = useApp((s) => s.pop);
  const showToast = useApp((s) => s.showToast);
  const existing = useLiveQuery(async () => (id ? ((await db.cardio.get(id)) ?? null) : null), [id]);
  const [c, setC] = useState<CardioSession>(blank);
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (existing) setC(existing);
  }, [existing]);

  const set = <K extends keyof CardioSession>(k: K, v: CardioSession[K]) => setC((p) => ({ ...p, [k]: v }));
  const isInt = c.mode === 'Intervalle';

  const save = async () => {
    const clean: CardioSession = isInt ? c : { ...c, restSec: 0, rounds: 1 };
    await db.cardio.put(clean);
    haptic('success');
    pop();
    showToast(id ? 'Cardio aktualisiert' : 'Cardio gespeichert');
  };

  return (
    <div className="pb-16">
      <ScreenHeader
        title={id ? 'Cardio bearbeiten' : 'Cardio eintragen'}
        onBack={pop}
        right={
          id ? (
            <button onClick={() => setDel(true)} className="grid h-10 w-10 place-items-center text-danger" aria-label="Löschen">
              <Trash2 size={20} />
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-5 px-4 pt-5">
        <Field label="Gerät">
          <Segmented id="device" value={c.device} onChange={(v) => set('device', v)} options={CARDIO_DEVICES.map((d) => ({ value: d, label: d }))} />
        </Field>
        <Field label="Typ">
          <Segmented id="mode" value={c.mode} onChange={(v) => set('mode', v)} options={CARDIO_MODES.map((d) => ({ value: d, label: d }))} />
        </Field>

        <div className={isInt ? 'grid grid-cols-2 gap-3' : ''}>
          <Field label={isInt ? 'Arbeitszeit / Runde' : 'Dauer'}>
            <Duration value={c.workSec} onChange={(v) => set('workSec', v)} />
          </Field>
          {isInt && (
            <Field label="Pause / Runde">
              <Duration value={c.restSec} onChange={(v) => set('restSec', v)} />
            </Field>
          )}
        </div>
        {isInt && (
          <Field label="Runden">
            <Stepper value={c.rounds} onChange={(v) => set('rounds', v)} min={1} max={99} />
          </Field>
        )}
        <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
          Gesamtdauer: <span className="font-semibold text-zinc-100">{fmtMinutes(cardioDuration(c))}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Meter">
            <div className="flex h-12 items-center rounded-2xl border border-line bg-surface-3/60 px-3">
              <NumberField value={c.meters} onChange={(v) => set('meters', v)} className="w-full text-left text-[17px]" />
              <span className="text-sm text-muted">m</span>
            </div>
          </Field>
          <Field label="Kalorien">
            <div className="flex h-12 items-center rounded-2xl border border-line bg-surface-3/60 px-3">
              <NumberField value={c.kcal} onChange={(v) => set('kcal', v)} className="w-full text-left text-[17px]" />
              <span className="text-sm text-muted">kcal</span>
            </div>
          </Field>
        </div>

        <Field label="Datum & Uhrzeit">
          <input
            type="datetime-local"
            value={toLocalInput(c.date)}
            onChange={(e) => e.target.value && set('date', new Date(e.target.value).getTime())}
            className={inputCls}
          />
        </Field>
        <Field label="Notiz">
          <textarea value={c.note} onChange={(e) => set('note', e.target.value)} rows={3} placeholder="z. B. Widerstand 6, Puls 135" className={`${inputCls} h-auto resize-none py-3`} />
        </Field>

        <Btn className="h-14 text-[17px]" onClick={save}>
          Speichern
        </Btn>
      </div>
      <Confirm
        open={del}
        onClose={() => setDel(false)}
        title="Eintrag löschen?"
        text="Diese Cardio-Einheit wird dauerhaft entfernt."
        confirmLabel="Löschen"
        danger
        onConfirm={async () => {
          if (id) await db.cardio.delete(id);
          pop();
          showToast('Cardio gelöscht');
        }}
      />
    </div>
  );
}
