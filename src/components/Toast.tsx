import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useApp } from '../store';

export function ToastHost() {
  const toast = useApp((s) => s.toast);
  const hide = useApp((s) => s.hideToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, toast.action ? 5000 : 2800);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', damping: 28, stiffness: 420 }}
            className={`pointer-events-auto mx-4 mt-2 flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
              toast.tone === 'pr' ? 'border-pr/40 bg-[#2a2210]/95' : 'border-line bg-surface-3/95'
            }`}
          >
            {toast.tone === 'pr' && <Trophy size={18} className="shrink-0 text-pr" />}
            <span className="text-[15px] font-medium">{toast.text}</span>
            {toast.action && (
              <button
                className="ml-1 shrink-0 text-[15px] font-bold text-accent"
                onClick={() => {
                  toast.action!.run();
                  hide();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
