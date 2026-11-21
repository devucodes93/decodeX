/**
 * "Ting" for new hints, synthesised with Web Audio (no sound file).
 * Browsers only allow audio after the visitor has clicked or typed on the
 * page, so the audio context is unlocked on the first interaction. Players
 * always click to sign in or start, so in practice it's ready in time.
 */
type Ctx = AudioContext;

let ctx: Ctx | null = null;

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    return null;
  }
  return ctx;
}

function unlock() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume().catch(() => undefined);
}

if (typeof window !== "undefined") {
  const once = () => {
    unlock();
    window.removeEventListener("pointerdown", once, true);
    window.removeEventListener("keydown", once, true);
  };
  window.addEventListener("pointerdown", once, true);
  window.addEventListener("keydown", once, true);
}

/** A short bright bell: two partials with a fast attack and a ringing decay. */
export function playTing() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => undefined);
  const t = c.currentTime + 0.01;
  const master = c.createGain();
  master.gain.value = 0.22;
  master.connect(c.destination);

  for (const [freq, level, decay] of [
    [1760, 1, 1.1], // A6: the "ting"
    [2637, 0.45, 0.6], // E7: shimmer
    [5274, 0.12, 0.25], // E8: strike
  ] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}
