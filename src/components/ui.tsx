import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useDragControls, type HTMLMotionProps } from 'framer-motion';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { fmt0, parseNum } from '../lib/format';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-accent text-accent-ink',
  secondary: 'bg-surface-3 text-zinc-100',
  ghost: 'bg-transparent text-zinc-300',
  danger: 'bg-danger/15 text-danger',
};

export function Btn({
  variant = 'primary',
  className,
  ...p
}: HTMLMotionProps<'button'> & { variant?: BtnVariant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cx(
        'inline-flex h-12 select-none items-center justify-center gap-2 rounded-2xl px-4 text-[16px] font-semibold disabled:opacity-40',
        BTN[variant],
        className,
      )}
      {...p}
    />
  );
}

export function IconBtn({ className, ...p }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.1 }}
      className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 active:bg-surface-3', className)}
      {...p}
    />
  );
}

// ---------- Layout ----------
export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="pt-safe px-4">
      <div className="flex items-end justify-between gap-3 pb-4 pt-5">
        <div className="min-w-0">
          {sub && <div className="mb-0.5 text-[13px] font-medium text-muted">{sub}</div>}
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

export function ScreenHeader({ title, onBack, right, sub }: { title: ReactNode; onBack: () => void; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="pt-safe sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-1 px-2">
        <IconBtn onClick={onBack} aria-label="Zurück">
          <ChevronLeft size={26} />
        </IconBtn>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[17px] font-semibold">{title}</div>
          {sub && <div className="text-xs text-muted">{sub}</div>}
        </div>
        <div className="flex min-w-10 justify-end">{right}</div>
      </div>
    </div>
  );
}

export function Card({ className, children, ...p }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cx('rounded-3xl border border-line/60 bg-surface', className)} {...p}>
      {children}
    </motion.div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {right}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-surface-2', className)} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-surface-2 text-muted">{icon}</div>
      <div className="text-[17px] font-semibold">{title}</div>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------- Segmented / Toggle ----------
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  id: string;
  className?: string;
}) {
  return (
    <div className={cx('flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative h-9 flex-1 rounded-xl px-2 text-[14px] font-semibold"
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-surface-3 shadow"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className={cx('relative', on ? 'text-zinc-50' : 'text-muted')}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx('relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200', on ? 'bg-accent' : 'bg-surface-3')}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow"
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  );
}

// ---------- Zahlen ----------
const toText = (v: number, empty: boolean) => (empty && v === 0 ? '' : String(v).replace('.', ','));

export function NumberField({
  value,
  onChange,
  decimal = false,
  placeholder = '0',
  className,
  emptyZero = true,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  decimal?: boolean;
  placeholder?: string;
  className?: string;
  emptyZero?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(() => toText(value, emptyZero));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(toText(value, emptyZero));
  }, [value, emptyZero]);
  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        const el = e.currentTarget;
        setTimeout(() => el.setSelectionRange(0, el.value.length), 0);
      }}
      onBlur={() => {
        focused.current = false;
        const n = parseNum(text);
        if (n === null) {
          onChange(0);
          setText(toText(0, emptyZero));
        } else setText(toText(value, emptyZero));
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '');
        setText(t);
        const n = parseNum(t);
        if (n !== null) onChange(decimal ? n : Math.round(n));
      }}
      className={cx('min-w-0 bg-transparent text-center font-semibold tabular outline-none placeholder:text-zinc-600', className)}
    />
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  format,
  decimal,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  decimal?: boolean;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div className="flex h-11 items-center rounded-xl bg-surface-3">
      <motion.button whileTap={{ scale: 0.85 }} type="button" className="grid h-11 w-10 place-items-center text-zinc-300" onClick={() => set(value - step)} aria-label="weniger">
        <Minus size={18} />
      </motion.button>
      {format ? (
        <span className="min-w-14 text-center text-[16px] font-semibold tabular">{format(value)}</span>
      ) : (
        <NumberField value={value} onChange={set} decimal={decimal} emptyZero={false} className="w-14 text-[16px]" />
      )}
      <motion.button whileTap={{ scale: 0.85 }} type="button" className="grid h-11 w-10 place-items-center text-zinc-300" onClick={() => set(value + step)} aria-label="mehr">
        <Plus size={18} />
      </motion.button>
    </div>
  );
}

export function AnimatedNumber({
  value,
  format = fmt0,
  duration = 1.2,
  delay = 0,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span ref={ref} className="tabular">
      {format(0)}
    </span>
  );
}

// ---------- Sheet ----------
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  const controls = useDragControls();
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[50] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            className="pb-safe fixed inset-x-0 bottom-0 z-[51] mx-auto flex max-h-[90dvh] max-w-xl flex-col rounded-t-[28px] border-t border-line bg-surface-2"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, i) => {
              if (i.offset.y > 110 || i.velocity.y > 600) onClose();
            }}
          >
            <div className="cursor-grab touch-none px-5 pb-2 pt-2.5" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto h-1.5 w-10 rounded-full bg-zinc-600" />
              {title && <div className="mt-3 text-center text-[17px] font-semibold">{title}</div>}
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function SheetAction({
  icon,
  children,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className={cx(
        'flex h-14 w-full items-center gap-3 rounded-2xl bg-surface-3/70 px-4 text-left text-[16px] font-medium',
        danger ? 'text-danger' : 'text-zinc-100',
      )}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export function Confirm({
  open,
  onClose,
  title,
  text,
  confirmLabel,
  onConfirm,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {text && <p className="mb-5 text-center text-[15px] text-muted">{text}</p>}
      <div className="flex flex-col gap-2">
        <Btn
          variant={danger ? 'danger' : 'primary'}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Btn>
        <Btn variant="secondary" onClick={onClose}>
          Abbrechen
        </Btn>
      </div>
    </Sheet>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'h-12 w-full rounded-2xl border border-line bg-surface-3/60 px-4 text-[16px] outline-none focus:border-accent/60';
