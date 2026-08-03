export function announce(message) {
  const live = document.getElementById('live-region');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}

export function applySettings(settings) {
  document.documentElement.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  document.documentElement.classList.toggle('large-text', Boolean(settings.largeText));
  document.documentElement.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
}
