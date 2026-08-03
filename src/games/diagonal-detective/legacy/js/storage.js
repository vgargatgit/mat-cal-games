import { defaultState, SCHEMA_VERSION } from './state.js';

const STORAGE_KEY = 'arcade.legacy.diagonal-detective.v1';

function isPlainObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

export function validateImportedState(value) {
  const errors = [];
  if (!isPlainObject(value)) errors.push('Root must be an object.');
  if (value?.schemaVersion !== SCHEMA_VERSION) errors.push(`Unsupported schema version: ${value?.schemaVersion}`);
  if (!isPlainObject(value?.learner)) errors.push('Missing learner object.');
  const game = value?.learner?.games?.diagonalDetective;
  if (!isPlainObject(game)) errors.push('Missing diagonalDetective game state.');
  if (game && !isPlainObject(game.progress)) errors.push('Missing progress object.');
  if (game && !isPlainObject(game.mastery)) errors.push('Missing mastery object.');
  return { valid: errors.length === 0, errors };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const validation = validateImportedState(parsed);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    return parsed;
  } catch (error) {
    console.warn('Diagonal Detective recovered from corrupted state.', error);
    const recovered = defaultState();
    try { localStorage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, localStorage.getItem(STORAGE_KEY) ?? ''); } catch {}
    saveState(recovered);
    return recovered;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = defaultState();
  saveState(state);
  return state;
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `diagonal-detective-progress-${new Date().toISOString().slice(0,10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importState(file) {
  if (!(file instanceof File) || file.size > 1_000_000) throw new Error('Choose a progress JSON file smaller than 1 MB.');
  const parsed = JSON.parse(await file.text());
  const validation = validateImportedState(parsed);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  saveState(parsed);
  return parsed;
}
