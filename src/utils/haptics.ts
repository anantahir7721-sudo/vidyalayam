/**
 * Universal Professional Haptic Feedback Engine
 * Supports:
 * 1. Physical Device Vibration API (Android Chrome, Firefox, Mobile web)
 * 2. High-precision Web Audio API micro-tick fallback (iOS Safari, Mac/PC desktop)
 *    generates authentic Apple Taptic Engine mechanical clicks!
 */

type HapticType = 'tick' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

class HapticEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;

  constructor() {
    // Lazily initialize Web Audio on first user interaction
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass && !this.audioCtx) {
            this.audioCtx = new AudioContextClass();
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
        } catch (e) {
          // Ignore audio initialization errors
        }
      };

      window.addEventListener('pointerdown', initAudio, { once: true, passive: true });
      window.addEventListener('keydown', initAudio, { once: true, passive: true });
    }
  }

  /**
   * Generates a subtle, high-frequency mechanical micro-click (iOS Taptic style)
   */
  private playMicroClick(frequency = 280, durationMs = 8, gainLevel = 0.08) {
    if (!this.soundEnabled || typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Sharp sine/triangle click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, now + durationMs / 1000);

      // Fast exponential decay envelope
      gain.gain.setValueAtTime(gainLevel, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000);
    } catch (e) {
      // Audio fallback silent fail
    }
  }

  /**
   * Triggers hardware vibration if supported
   */
  private vibrate(pattern: number | number[]): boolean {
    if (!this.vibrationEnabled || typeof window === 'undefined') return false;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        return navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignore vibration error
    }
    return false;
  }

  /**
   * Ultra-subtle tick for wheel scrolling / drum picker snap
   */
  tick() {
    const hasVibrated = this.vibrate(6);
    this.playMicroClick(340, 4, 0.04);
  }

  /**
   * Light feedback for tab switch, date select, or minor action
   */
  light() {
    this.vibrate(10);
    this.playMicroClick(260, 6, 0.06);
  }

  /**
   * Medium feedback for button clicks, toggles, modal open
   */
  medium() {
    this.vibrate(22);
    this.playMicroClick(210, 10, 0.09);
  }

  /**
   * Heavy feedback for primary action, delete, confirm
   */
  heavy() {
    this.vibrate(36);
    this.playMicroClick(150, 14, 0.12);
  }

  /**
   * Success feedback melody (save, exam submit, download)
   */
  success() {
    this.vibrate([15, 45, 25]);
    this.playMicroClick(440, 10, 0.08);
    setTimeout(() => this.playMicroClick(660, 14, 0.1), 60);
  }

  /**
   * Warning feedback
   */
  warning() {
    this.vibrate([30, 40, 30]);
    this.playMicroClick(220, 12, 0.1);
  }

  /**
   * Error feedback
   */
  error() {
    this.vibrate([40, 50, 40, 50, 40]);
    this.playMicroClick(130, 16, 0.14);
  }

  /**
   * Custom trigger by name
   */
  trigger(type: HapticType = 'medium') {
    switch (type) {
      case 'tick':
        this.tick();
        break;
      case 'light':
        this.light();
        break;
      case 'medium':
        this.medium();
        break;
      case 'heavy':
        this.heavy();
        break;
      case 'success':
        this.success();
        break;
      case 'warning':
        this.warning();
        break;
      case 'error':
        this.error();
        break;
    }
  }
}

export const haptic = new HapticEngine();

/**
 * Attaches global haptic feedback listeners to interactive elements
 * Automatically gives every button, tab, and toggle a satisfying tactile click!
 */
export function initializeGlobalHaptics(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if element or parent has data-haptic
    const hapticEl = target.closest('[data-haptic]') as HTMLElement | null;
    if (hapticEl) {
      const type = hapticEl.getAttribute('data-haptic') as HapticType;
      if (type === 'none' as any) return;
      haptic.trigger(type || 'light');
      return;
    }

    // Interactive button or clickable role
    const buttonEl = target.closest('button, [role="button"], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"], select, summary') as HTMLElement | null;
    if (buttonEl) {
      // Don't duplicate if handled internally
      if (buttonEl.getAttribute('data-haptic-ignore') === 'true') return;
      
      const isDangerous =
        buttonEl.classList.contains('bg-rose-600') ||
        buttonEl.classList.contains('bg-red-600') ||
        buttonEl.textContent?.includes('ડિલીટ') ||
        buttonEl.textContent?.includes('Delete');

      if (isDangerous) {
        haptic.heavy();
      } else {
        haptic.light();
      }
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, { passive: true });

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
  };
}
