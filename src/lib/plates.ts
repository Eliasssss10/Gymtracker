export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATE_STYLE: Record<number, { color: string; h: number }> = {
  25: { color: '#e5484d', h: 100 },
  20: { color: '#3e7bfa', h: 100 },
  15: { color: '#f5c518', h: 90 },
  10: { color: '#30a46c', h: 78 },
  5: { color: '#e8e8ec', h: 62 },
  2.5: { color: '#8b8b96', h: 50 },
  1.25: { color: '#c2c2c8', h: 42 },
};

/** Welche Scheiben müssen pro Seite auf die Stange? (Greedy in 10-g-Schritten) */
export function calcPlates(total: number, bar = 20, plates = PLATES) {
  const perSideTarget = (total - bar) / 2;
  if (perSideTarget <= 0) return { perSide: [] as number[], remainder: 0, achieved: bar };
  let rest = Math.round(perSideTarget * 100);
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    const pc = Math.round(p * 100);
    while (rest >= pc) {
      perSide.push(p);
      rest -= pc;
    }
  }
  const side = perSide.reduce((a, b) => a + b, 0);
  return { perSide, remainder: rest / 100, achieved: Math.round((bar + 2 * side) * 100) / 100 };
}
