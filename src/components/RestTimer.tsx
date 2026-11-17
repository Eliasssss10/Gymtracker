import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '../store';
import { useNow } from '../hooks/data';
import { fmtClock } from '../lib/format';
import { beep, haptic } from '../lib/feedback';

/** Läuft global: meldet das Pausenende auch, wenn das Workout minimiert ist. */
export function useRestWatcher() {
  const endAt = useApp((s) => s.rest?.endAt);
  const done = useApp((s) => s.rest?.done);
  useEffect(() => {
    if (!endAt) return;
    const ms = endAt - Date.now();
    if (ms < -5000) {
      useApp.getState().stopRest();
      return;
    }
    const t = setTimeout(() => {
      const { settings, markRestDone } = useApp.getState();
      haptic('heavy');
      if (settings.sound) beep();
      markRestDone();
    }, Math.max(0, ms));
    return () => clearTimeout(t);
  }, [endAt]);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => useApp.getState().stopRest(), 3000);
    return () => clearTimeout(t);
  }, [done]);
}

const R = 21;
const C = 2 * Math.PI * R;

export function RestTimer() {
  const rest = useApp((s) => s.rest);
  const onWorkout = useApp((s) => s.stack.at(-1)?.name === 'workout');
  const adjust = useApp((s) => s.adjustRest);
  const stop = useApp((s) => s.stopRest);
  const now = useNow(200, !!rest);
  const visible = !!rest && onWorkout;
  const remaining = rest ? Math.max(0, (rest.endAt - now) / 1000) : 0;
  const p = rest ? Math.min(1, remaining / rest.total) : 0;

  return (
    <AnimatePresence>
      {visible && rest && (
        <motion.div
          key="rest"
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 140, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 360 }}
          className="fixed inset-x-3 z-[45] mx-auto flex max-w-xl items-center gap-3 rounded-[24px] border border-line bg-surface-2/95 px-3 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <motion.div
            className="relative grid h-[52px] w-[52px] shrink-0 place-items-center"
            animate={rest.done ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={rest.done ? { repeat: Infinity, duration: 0.7 } : undefined}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
              <circle cx="26" cy="26" r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth="5" />
              <circle
                cx="26"
                cy="26"
                r={R}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - p)}
                style={{ transition: 'stroke-dashoffset 0.2s linear' }}
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-muted tabular">{Math.round(p * 100)}%</span>
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className={`text-[26px] font-bold leading-none tabular ${rest.done ? 'text-accent' : ''}`}>
              {rest.done ? 'Weiter!' : fmtClock(Math.ceil(remaining))}
            </div>
            <div className="mt-1 truncate text-xs text-muted">Pause · {rest.label}</div>
          </div>
          {!rest.done && (
            <>
              <TimerBtn onClick={() => adjust(-15)}>−15</TimerBtn>
              <TimerBtn onClick={() => adjust(15)}>+15</TimerBtn>
            </>
          )}
          <TimerBtn onClick={stop} aria-label="Pause beenden">
            <X size={18} />
          </TimerBtn>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TimerBtn(p: { onClick: () => void; children: ReactNode; 'aria-label'?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={p.onClick}
      aria-label={p['aria-label']}
      className="grid h-11 min-w-11 place-items-center rounded-xl bg-surface-3 px-2 text-[14px] font-semibold text-zinc-200 tabular"
    >
      {p.children}
    </motion.button>
  );
}
