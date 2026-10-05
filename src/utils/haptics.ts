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
    if ('vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(12);
      else if (type === 'medium') navigator.vibrate(28);
      else if (type === 'heavy') navigator.vibrate(55);
    }
  } catch {}
}
