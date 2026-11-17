import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronRight, GripVertical, Plus } from 'lucide-react';
import { db } from '../db/db';
import { DAY_COLORS } from '../db/defaults';
import { useApp } from '../store';
import { useDays, useExerciseMap } from '../hooks/data';
import { uid } from '../lib/uid';
import { haptic } from '../lib/feedback';
import type { Exercise, PlanDay } from '../types';
import { Btn, ListSkeleton, PageHeader } from '../components/ui';

export function PlanScreen() {
  const days = useDays();
  const exMap = useExerciseMap();
  const push = useApp((s) => s.push);
  const [order, setOrder] = useState<PlanDay[]>([]);

  useEffect(() => {
    if (days) setOrder(days);
  }, [days]);

  const persist = async () => {
    await db.transaction('rw', db.days, async () => {
      await Promise.all(order.map((d, i) => db.days.update(d.id, { order: i })));
    });
  };

  const addDay = async () => {
    const d: PlanDay = { id: uid(), name: 'Neuer Tag', order: order.length, color: DAY_COLORS[order.length % DAY_COLORS.length], items: [] };
    await db.days.put(d);
    push({ name: 'day', dayId: d.id });
  };

  return (
    <>
      <PageHeader title="Plan" sub={`${order.length}er-Split · Rotation`} />
      <div className="px-4">
        {!days || !exMap ? (
          <ListSkeleton rows={5} />
        ) : (
          <>
            <p className="mb-3 px-1 text-[13px] text-muted">Reihenfolge = Rotation. Zum Sortieren am Griff ziehen.</p>
            <Reorder.Group axis="y" values={order} onReorder={setOrder} className="flex flex-col gap-2">
              {order.map((d) => (
                <DayRow key={d.id} day={d} exMap={exMap} onOpen={() => push({ name: 'day', dayId: d.id })} onDrop={persist} />
              ))}
            </Reorder.Group>
            <Btn variant="secondary" className="mt-3 h-14 w-full" onClick={addDay}>
              <Plus size={20} /> Trainingstag hinzufügen
            </Btn>
          </>
        )}
      </div>
    </>
  );
}

function DayRow({ day, exMap, onOpen, onDrop }: { day: PlanDay; exMap: Map<string, Exercise>; onOpen: () => void; onDrop: () => void }) {
  const controls = useDragControls();
  const names = day.items.map((i) => exMap.get(i.exerciseId)?.name).filter(Boolean);
  const sets = day.items.reduce((a, i) => a + i.sets, 0);
  return (
    <Reorder.Item
      value={day}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
      className="flex items-center gap-1 rounded-3xl border border-line/60 bg-surface pr-3"
    >
      <div
        className="grid h-full min-h-20 w-11 shrink-0 touch-none place-items-center text-muted"
        onPointerDown={(e) => {
          haptic('light');
          controls.start(e);
        }}
        aria-label="Ziehen zum Sortieren"
      >
        <GripVertical size={20} />
      </div>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-4 text-left">
        <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: day.color }} />
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-bold">{day.name}</div>
          <div className="text-[13px] text-muted">
            {day.items.length} Übungen · {sets} Sätze
          </div>
          <div className="mt-0.5 truncate text-[13px] text-zinc-400">{names.join(' · ') || 'Noch leer'}</div>
        </div>
        <ChevronRight size={20} className="shrink-0 text-muted" />
      </button>
    </Reorder.Item>
  );
}
