import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store';
import { calcPlates, PLATE_STYLE } from '../lib/plates';
import { fmt } from '../lib/format';
import { Sheet, Stepper } from './ui';

export function PlateCalculator({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: number }) {
  const bar = useApp((s) => s.settings.barWeight);
  const [total, setTotal] = useState(initial);
  useEffect(() => {
    if (open) setTotal(Math.max(initial, bar));
  }, [open, initial, bar]);
  const r = calcPlates(total, bar);

  return (
    <Sheet open={open} onClose={onClose} title="Hantelscheiben">
      <div className="flex flex-col items-center gap-4">
        <Stepper value={total} onChange={setTotal} step={2.5} min={bar} decimal />
        <div className="text-sm text-muted">
          Stange {fmt(bar)} kg · pro Seite {fmt(Math.max(0, (total - bar) / 2))} kg
        </div>

        {/* Stange */}
        <div className="relative my-2 flex h-[120px] w-full items-center justify-center">
          <div className="absolute inset-x-6 h-3 rounded-full bg-gradient-to-b from-zinc-300 to-zinc-500" />
          <div className="relative flex items-center gap-[3px]">
            <div className="h-7 w-3 rounded-sm bg-zinc-400" />
            <AnimatePresence mode="popLayout">
              {r.perSide.map((p, i) => (
                <motion.div
                  key={`${i}-${p}`}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34, delay: i * 0.03 }}
                  className="rounded-[4px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
                  style={{ background: PLATE_STYLE[p]?.color ?? '#aaa', height: PLATE_STYLE[p]?.h ?? 50, width: p >= 10 ? 16 : 11 }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {r.perSide.length === 0 ? (
          <p className="text-[15px] text-muted">Nur die leere Stange.</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(
              r.perSide.reduce<Record<string, number>>((a, p) => ({ ...a, [p]: (a[p] ?? 0) + 1 }), {}),
            )
              .sort((a, b) => Number(b[0]) - Number(a[0]))
              .map(([p, n]) => (
                <span key={p} className="flex items-center gap-2 rounded-full bg-surface-3 px-3 py-1.5 text-[15px] font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: PLATE_STYLE[Number(p)]?.color }} />
                  {n} × {fmt(Number(p))} kg
                </span>
              ))}
          </div>
        )}
        <p className="text-center text-sm text-muted">pro Seite</p>
        {r.remainder > 0 && (
          <p className="text-center text-sm text-pr">
            {fmt(total)} kg ist nicht exakt ladbar – nächstmöglich: {fmt(r.achieved)} kg
          </p>
        )}
      </div>
    </Sheet>
  );
}
