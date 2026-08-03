export function announce(message) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

export function applySettings(settings) {
  document.body.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
  document.body.classList.toggle('large-text', Boolean(settings.largeText));
  const motion = document.getElementById('motion-toggle');
  const text = document.getElementById('text-size-toggle');
  motion?.setAttribute('aria-pressed', String(Boolean(settings.reducedMotion)));
  text?.setAttribute('aria-pressed', String(Boolean(settings.largeText)));
}

export function focusMain() {
  document.getElementById('main-content')?.focus({ preventScroll: true });
}
