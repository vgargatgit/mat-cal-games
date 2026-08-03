const STORAGE_KEY = 'arcade.legacy.build-jacobian.v1';
export const SCHEMA_VERSION = 1;

export function defaultStore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    learner: {
      games: {
        buildTheJacobian: {
          progress: { currentLevel: 1, completedLevels: [], completedRoundIds: [], totalScore: 0, roundsCompleted: 0, firstAttemptCorrect: 0 },
          mastery: {},
          misconceptions: {},
          currentRound: null,
          tutorialCompleted: false,
          conceptDiscoveries: [],
        },
      },
      settings: { theme: 'light', reducedMotion: false, largeText: false, highContrast: false },
    },
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateStore(candidate) {
  if (!isPlainObject(candidate)) return { ok: false, error: 'Progress file must contain an object.' };
  if (candidate.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: `Unsupported schema version ${candidate.schemaVersion}.` };
  const learner = candidate.learner;
  const game = learner?.games?.buildTheJacobian;
  if (!isPlainObject(learner) || !isPlainObject(game)) return { ok: false, error: 'Missing learner game data.' };
  if (!isPlainObject(game.progress) || !isPlainObject(game.mastery) || !isPlainObject(game.misconceptions)) {
    return { ok: false, error: 'Progress, mastery, or misconception data is invalid.' };
  }
  if (!Number.isFinite(Number(game.progress.currentLevel)) || Number(game.progress.currentLevel) < 1 || Number(game.progress.currentLevel) > 14) {
    return { ok: false, error: 'Current level is outside the supported range.' };
  }
  if (!Array.isArray(game.progress.completedLevels)) return { ok: false, error: 'Completed levels must be an array.' };
  return { ok: true };
}

export function migrateStore(candidate) {
  if (!candidate || typeof candidate !== 'object') return defaultStore();
  if (candidate.schemaVersion === SCHEMA_VERSION) return candidate;
  return defaultStore();
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = migrateStore(JSON.parse(raw));
    const validation = validateStore(parsed);
    if (!validation.ok) throw new Error(validation.error);
    return mergeDefaults(defaultStore(), parsed);
  } catch (error) {
    console.warn('Progress was corrupt and has been recovered.', error);
    const recovered = defaultStore();
    try { localStorage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, localStorage.getItem(STORAGE_KEY) || ''); } catch {}
    return recovered;
  }
}

function mergeDefaults(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults;
  if (!isPlainObject(defaults)) return value ?? defaults;
  const merged = { ...defaults };
  if (!isPlainObject(value)) return merged;
  for (const [key, defaultValue] of Object.entries(defaults)) merged[key] = mergeDefaults(defaultValue, value[key]);
  for (const [key, suppliedValue] of Object.entries(value)) if (!(key in merged)) merged[key] = suppliedValue;
  return merged;
}

export function saveStore(store) {
  const validation = validateStore(store);
  if (!validation.ok) throw new Error(validation.error);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetStore() {
  const store = defaultStore();
  saveStore(store);
  return store;
}

export function exportStore(store) {
  const validation = validateStore(store);
  if (!validation.ok) throw new Error(validation.error);
  return JSON.stringify(store, null, 2);
}

export function importStore(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'The selected file is not valid JSON.' }; }
  const migrated = migrateStore(parsed);
  const validation = validateStore(migrated);
  if (!validation.ok) return validation;
  return { ok: true, store: mergeDefaults(defaultStore(), migrated) };
}

export function gameState(store) {
  return store.learner.games.buildTheJacobian;
}
