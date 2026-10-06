export function initializeGlobalHaptics() {
  if (typeof window === 'undefined') return;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A' || target.closest('a'))) {
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(12);
        }
      } catch {}
    }
  }, { passive: true });
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(12);
      else if (type === 'medium') navigator.vibrate(28);
      else if (type === 'heavy') navigator.vibrate(55);
    }
  } catch {}
}

export const haptic = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  tick: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {}
  },
  selection: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {}
  },
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([15, 60, 25]);
      }
    } catch {}
  },
  warning: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([25, 50, 25]);
      }
    } catch {}
  },
  error: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 60, 40, 60, 50]);
      }
    } catch {}
  },
};

export default haptic;
