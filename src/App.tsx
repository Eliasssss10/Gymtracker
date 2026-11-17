import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { useApp, type Screen, type Tab } from './store';
import { useWakeLock } from './hooks/data';
import { BottomNav } from './components/BottomNav';
import { RestTimer, useRestWatcher } from './components/RestTimer';
import { ToastHost } from './components/Toast';
import { TodayScreen } from './screens/TodayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { PlanScreen } from './screens/PlanScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { CardioForm } from './screens/CardioForm';
import { DayEditor } from './screens/DayEditor';

function renderTab(t: Tab) {
  switch (t) {
    case 'today':
      return <TodayScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'plan':
      return <PlanScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

function renderScreen(s: Screen) {
  switch (s.name) {
    case 'workout':
      return <WorkoutScreen />;
    case 'summary':
      return <SummaryScreen workoutId={s.workoutId} mode="summary" />;
    case 'workoutDetail':
      return <SummaryScreen workoutId={s.workoutId} mode="detail" />;
    case 'cardio':
      return <CardioForm id={s.id} />;
    case 'day':
      return <DayEditor dayId={s.dayId} />;
  }
}

const screenKey = (s: Screen) =>
  s.name + ('workoutId' in s ? s.workoutId : '') + ('dayId' in s ? s.dayId : '') + ('id' in s ? (s.id ?? '') : '');

const ease = [0.32, 0.72, 0, 1] as const;

function Overlay({ screen, z, children }: { screen: Screen; z: number; children: ReactNode }) {
  const variant =
    screen.name === 'workout'
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
      : screen.name === 'summary'
        ? { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0 } }
        : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };
  return (
    <motion.div
      className="fixed inset-0 overflow-y-auto overscroll-contain bg-bg"
      style={{ zIndex: z }}
      {...variant}
      transition={{ type: 'tween', ease, duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const tab = useApp((s) => s.tab);
  const stack = useApp((s) => s.stack);
  const active = useApp((s) => s.active);

  useEffect(() => {
    void init();
  }, [init]);
  useWakeLock(!!active);
  useRestWatcher();

  if (!ready) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-bg">
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <Dumbbell size={44} className="text-accent" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={tab}
            className="absolute inset-0 overflow-y-auto overscroll-contain"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pb-28">{renderTab(tab)}</div>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <AnimatePresence>
        {stack.map((s, i) => (
          <Overlay key={screenKey(s)} screen={s} z={30 + i}>
            {renderScreen(s)}
          </Overlay>
        ))}
      </AnimatePresence>
      <RestTimer />
      <ToastHost />
    </div>
  );
}
