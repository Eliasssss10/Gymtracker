import { memo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Minus, Plus, Trash2, Trophy } from 'lucide-react';
import type { MeasureType, SetEntry } from '../types';
import type { PRType } from '../lib/records';
import { round2 } from '../lib/format';
import { NumberField, cx } from './ui';

export const SET_GRID = 'grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-1.5';

function Step({
  value,
  onChange,
  step,
  decimal,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  decimal?: boolean;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex h-11 min-w-0 items-center rounded-xl bg-surface-2">
      <motion.button
        whileTap={{ scale: 0.82 }}
        type="button"
        aria-label={`${label} verringern`}
        className="grid h-11 w-8 shrink-0 place-items-center text-zinc-400 active:text-white"
        onClick={() => onChange(Math.max(0, round2(value - step)))}
      >
        <Minus size={16} strokeWidth={2.5} />
      </motion.button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center">
        <NumberField value={value} onChange={onChange} decimal={decimal} ariaLabel={label} className="w-full text-[17px]" />
        {suffix && <span className="-ml-1 pr-1 text-xs text-muted">{suffix}</span>}
      </div>
      <motion.button
        whileTap={{ scale: 0.82 }}
        type="button"
        aria-label={`${label} erhöhen`}
        className="grid h-11 w-8 shrink-0 place-items-center text-zinc-400 active:text-white"
        onClick={() => onChange(round2(value + step))}
      >
        <Plus size={16} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

interface Props {
  set: SetEntry;
  label: string;
  measure: MeasureType;
  weightStep: number;
  prs?: PRType[];
  onPatch: (id: string, p: Partial<SetEntry>) => void;
  onToggle: (s: SetEntry) => void;
  onDelete: (s: SetEntry) => void;
  onMenu: (s: SetEntry) => void;
}

export const SetRow = memo(function SetRow({ set, label, measure, weightStep, prs, onPatch, onToggle, onDelete, onMenu }: Props) {
  const x = useMotionValue(0);
  const trashOpacity = useTransform(x, [-110, -40, 0], [1, 0.5, 0]);
  const trashScale = useTransform(x, [-110, -40], [1.1, 0.8]);
  const isTime = measure === 'time';
  const isPR = !!prs?.length;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <motion.div
        style={{ opacity: trashOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-xl bg-danger pr-4 text-white"
      >
        <motion.span style={{ scale: trashScale }}>
          <Trash2 size={20} />
        </motion.span>
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.85, right: 0.05 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100 || info.velocity.x < -800) onDelete(set);
        }}
        className={cx(SET_GRID, 'relative rounded-xl px-1 py-1 transition-colors duration-200', set.done ? 'bg-done' : 'bg-surface')}
      >
        <button
          type="button"
          onClick={() => onMenu(set)}
          className={cx(
            'relative flex h-11 flex-col items-center justify-center rounded-lg text-[15px] font-bold tabular active:bg-surface-3',
            set.warmup ? 'text-pr' : isPR ? 'text-pr' : 'text-muted',
          )}
          aria-label={`Satz ${label} Optionen`}
        >
          {label}
          {isPR && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
              <Trophy size={11} strokeWidth={2.5} />
            </motion.span>
          )}
        </button>

        {!isTime && (
          <Step
            label={measure === 'bodyweight' ? 'Zusatzgewicht' : 'Gewicht'}
            value={set.weight}
            step={weightStep}
            decimal
            onChange={(v) => onPatch(set.id, { weight: v })}
          />
        )}
        <div className={isTime ? 'col-span-2' : ''}>
          <Step
            label={isTime ? 'Sekunden' : 'Wiederholungen'}
            value={set.reps}
            step={isTime ? 5 : 1}
            suffix={isTime ? 's' : undefined}
            onChange={(v) => onPatch(set.id, { reps: Math.round(v) })}
          />
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.86 }}
          animate={set.done ? { scale: [1, 1.14, 1] } : { scale: 1 }}
          transition={{ duration: 0.28 }}
          onClick={() => onToggle(set)}
          aria-label={set.done ? 'Satz offen' : 'Satz abhaken'}
          aria-pressed={set.done}
          className={cx(
            'grid h-11 w-11 place-items-center rounded-xl transition-colors duration-150',
            set.done ? 'bg-accent text-accent-ink' : 'bg-surface-3 text-zinc-500',
          )}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              key={set.done ? 'on' : 'off'}
              d="M5 12.5l4.5 4.5L19 7.5"
              initial={{ pathLength: set.done ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
});
