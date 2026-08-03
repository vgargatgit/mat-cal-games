export function createTrainingStore(key, defaults) {
  const fresh = () => structuredClone(defaults);
  return {
    load() {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value?.schemaVersion === defaults.schemaVersion ? { ...fresh(), ...value } : fresh();
      } catch { return fresh(); }
    },
    save(value) { localStorage.setItem(key, JSON.stringify(value)); },
    reset() { const value = fresh(); localStorage.setItem(key, JSON.stringify(value)); return value; },
  };
}

export function announce(host, message) {
  const region = host.querySelector('[data-training-live]');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

export function scoreStars({ attempts, hints, perfectThreshold }) {
  if (hints === 0 && attempts <= perfectThreshold) return 3;
  if (hints <= 2) return 2;
  return 1;
}
