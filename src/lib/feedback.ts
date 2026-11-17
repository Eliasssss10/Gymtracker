import confetti from 'canvas-confetti';

// ---------- Haptik ----------
let hapticsOn = true;
export const setHapticsEnabled = (v: boolean) => {
  hapticsOn = v;
};

/** iOS Safari kennt navigator.vibrate nicht – ein <input switch> löst dort aber ein Haptik-Tick aus (iOS 18+). */
function iosTick() {
  try {
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    document.head.removeChild(label);
  } catch {
    /* egal */
  }
}

export function haptic(kind: 'light' | 'success' | 'heavy' = 'light') {
  if (!hapticsOn) return;
  const pattern = kind === 'light' ? 12 : kind === 'success' ? [20, 60, 30] : [60, 90, 60, 90, 120];
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  } else {
    iosTick();
    if (kind !== 'light') setTimeout(iosTick, 140);
    if (kind === 'heavy') setTimeout(iosTick, 280);
  }
}

// ---------- Ton ----------
let ctx: AudioContext | null = null;

/** Muss einmal aus einer Nutzer-Geste aufgerufen werden (iOS). */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* kein Audio */
  }
}

export function beep(times = 3) {
  unlockAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === times - 1 ? 1175 : 880;
    const t = t0 + i * 0.28;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (i === times - 1 ? 0.45 : 0.18));
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }
}

// ---------- Konfetti ----------
const COLORS = ['#c8f53c', '#ffb020', '#ffffff', '#4da3ff', '#ff7a45'];
export function fireConfetti() {
  const base = { colors: COLORS, zIndex: 80, disableForReducedMotion: true, ticks: 220 };
  void confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 48, origin: { y: 0.72 } });
  setTimeout(() => void confetti({ ...base, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } }), 160);
  setTimeout(() => void confetti({ ...base, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } }), 300);
}
