export function announce(message) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => { region.textContent = message; }, 30);
}

export function applySettings(settings) {
  document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  document.documentElement.dataset.largeText = settings.largeText ? 'true' : 'false';
}

export function focusMain() {
  window.setTimeout(() => document.getElementById('app-main')?.focus(), 0);
}

export function enableKeyboardDrop(source, destinations, onPlace) {
  source.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    source.dataset.picked = source.dataset.picked === 'true' ? 'false' : 'true';
    source.setAttribute('aria-pressed', source.dataset.picked);
  });
  destinations.forEach((destination) => {
    destination.tabIndex = 0;
    destination.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      const picked = source.dataset.picked === 'true';
      if (!picked) return;
      event.preventDefault();
      onPlace(destination.dataset.zone);
      source.dataset.picked = 'false';
      source.setAttribute('aria-pressed', 'false');
    });
  });
}
