export function initStatusBarHelper() {
  if (typeof window === 'undefined') return;
  // Dynamic safe-area and status bar theme setup
  const updateStatusBar = () => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', '#0f172a');
  };
  updateStatusBar();
}
