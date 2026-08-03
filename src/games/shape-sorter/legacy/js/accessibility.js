export function applyAccessibilitySettings(settings) {
  document.body.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
  document.documentElement.style.setProperty('--font-scale', String(settings.fontScale ?? 1));
}

export function announce(message) {
  const region = document.querySelector('#live-region');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => { region.textContent = message; }, 20);
}
