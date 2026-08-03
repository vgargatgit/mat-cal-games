export function announce(message) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  window.requestAnimationFrame(() => { region.textContent = message; });
}

export function applySettings(settings) {
  document.documentElement.style.setProperty('--font-scale', String(settings.fontScale ?? 1));
  document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
}

export function focusHeading() {
  window.requestAnimationFrame(() => document.querySelector('main h1, main h2')?.focus());
}
