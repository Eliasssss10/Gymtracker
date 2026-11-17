import { AnimatePresence, motion } from 'framer-motion';
import { ChartColumn, ChevronUp, Dumbbell, History, ListChecks, Settings, Timer } from 'lucide-react';
import { useApp, type Tab } from '../store';
import { useNow } from '../hooks/data';
import { fmtClock } from '../lib/format';
import { haptic } from '../lib/feedback';

const ITEMS: { tab: Tab; label: string; Icon: typeof Dumbbell }[] = [
  { tab: 'today', label: 'Heute', Icon: Dumbbell },
  { tab: 'history', label: 'Verlauf', Icon: History },
  { tab: 'stats', label: 'Statistik', Icon: ChartColumn },
  { tab: 'plan', label: 'Plan', Icon: ListChecks },
  { tab: 'settings', label: 'Einstellungen', Icon: Settings },
];

function ActiveBar() {
  const active = useApp((s) => s.active);
  const rest = useApp((s) => s.rest);
  const push = useApp((s) => s.push);
  const now = useNow(1000, !!active);
  if (!active) return null;
  const restLeft = rest && !rest.done ? Math.max(0, (rest.endAt - now) / 1000) : 0;
  return (
    <motion.button
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => push({ name: 'workout' })}
      className="absolute inset-x-3 bottom-full mb-2 flex h-14 items-center gap-3 rounded-2xl border border-accent/25 bg-surface-2/95 px-4 text-left shadow-2xl backdrop-blur-xl"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">Training läuft · {active.dayName}</div>
        <div className="text-xs text-muted tabular">{fmtClock((now - active.startedAt) / 1000)}</div>
      </div>
      {restLeft > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-sm font-semibold text-accent tabular">
          <Timer size={14} /> {fmtClock(Math.ceil(restLeft))}
        </span>
      )}
      <ChevronUp size={20} className="text-muted" />
    </motion.button>
  );
}

export function BottomNav() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const active = useApp((s) => s.active);
  return (
    <nav className="pb-safe relative z-10 border-t border-line/70 bg-bg/90 backdrop-blur-xl">
      <AnimatePresence>{active && <ActiveBar key="active" />}</AnimatePresence>
      <div className="grid h-[58px] grid-cols-5">
        {ITEMS.map(({ tab: t, label, Icon }) => {
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => {
                if (on) return;
                haptic('light');
                setTab(t);
              }}
              className="relative flex flex-col items-center justify-center gap-0.5"
              aria-current={on ? 'page' : undefined}
            >
              {on && (
                <motion.span
                  layoutId="navpill"
                  className="absolute top-1 h-8 w-14 rounded-full bg-accent/12"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <Icon size={22} strokeWidth={on ? 2.4 : 1.9} className={`relative ${on ? 'text-accent' : 'text-muted'}`} />
              <span className={`relative text-[10px] font-medium ${on ? 'text-zinc-100' : 'text-muted'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
