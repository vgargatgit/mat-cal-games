const STORAGE_KEY = 'arcade.legacy.shape-sorter.v1';

export function loadState(defaultState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return structuredClone(defaultState);
    return mergeState(defaultState, parsed);
  } catch (error) {
    console.warn('Could not load saved progress.', error);
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not save progress.', error);
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(raw, defaultState) {
  const parsed = JSON.parse(raw);
  if (!isValidState(parsed)) throw new Error('This file is not a valid Shape Sorter progress export.');
  return mergeState(defaultState, parsed);
}

function mergeState(defaultState, candidate) {
  return {
    ...structuredClone(defaultState),
    ...candidate,
    progress: { ...defaultState.progress, ...candidate.progress },
    mastery: candidate.mastery ?? {},
    misconceptions: candidate.misconceptions ?? {},
    settings: { ...defaultState.settings, ...candidate.settings },
    session: { ...defaultState.session, ...candidate.session }
  };
}

function isValidState(value) {
  return Boolean(
    value &&
    value.schemaVersion === 1 &&
    typeof value.progress === 'object' &&
    typeof value.mastery === 'object' &&
    typeof value.misconceptions === 'object' &&
    typeof value.settings === 'object'
  );
}
