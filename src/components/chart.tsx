import { fmt1 } from '../lib/format';

export const CHART = {
  grid: '#262724',
  tick: { fill: '#8d8f88', fontSize: 11 },
};

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: { name?: string; value?: number | string; color?: string }[];
  unit?: string;
}

export function ChartTooltip({ active, payload, label, unit = '' }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-3/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-semibold text-zinc-200">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-zinc-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-zinc-50 tabular">{typeof p.value === 'number' ? fmt1(p.value) : p.value}</span>
          {unit && <span className="text-muted">{unit}</span>}
        </div>
      ))}
    </div>
  );
}
