// Web Audio API Synthesizer for Storefront Order Alerts (Zero external assets needed)

const CHIME_STORAGE_KEY = 'zs_order_sound_enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

export function isOrderSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(CHIME_STORAGE_KEY) !== 'false';
}

export function setOrderSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHIME_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Plays a pleasant double-bell order notification chime.
 * Tone 1: 587.33 Hz (D5)
 * Tone 2: 880.00 Hz (A5)
 * Tone 3: 1174.66 Hz (D6)
 */
export function playOrderChime(): void {
  if (!isOrderSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Helper to play a single bell chime
    const playBell = (freq: number, start: number, duration: number, gainValue: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainValue, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    playBell(587.33, now, 0.45, 0.25);
    playBell(880.00, now + 0.12, 0.65, 0.35);
    playBell(1174.66, now + 0.24, 0.8, 0.2);
  } catch (err) {
    console.debug('Failed to play order chime', err);
  }
}
