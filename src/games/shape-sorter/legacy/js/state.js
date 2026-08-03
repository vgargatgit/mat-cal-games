import { loadState, saveState } from './storage.js';

export const DEFAULT_STATE = {
  schemaVersion: 1,
  progress: {
    currentLevel: 1,
    unlockedLevel: 1,
    completedLevels: [],
    score: 0,
    bestScores: {},
    currentStreak: 0,
    totalRounds: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    hintsUsed: 0,
    tutorialComplete: false
  },
  mastery: {},
  misconceptions: {},
  settings: {
    reducedMotion: false,
    soundEnabled: false,
    fontScale: 1
  },
  session: {
    view: 'welcome',
    activeLevel: null,
    seed: null,
    roundIndex: 0,
    levelStartScore: 0
  }
};

let state = loadState(DEFAULT_STATE);
const listeners = new Set();

export function getState() { return state; }

export function setState(updater, { persist = true } = {}) {
  state = typeof updater === 'function' ? updater(structuredClone(state)) : structuredClone(updater);
  if (persist) saveState(state);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetInMemory() {
  state = structuredClone(DEFAULT_STATE);
  saveState(state);
  for (const listener of listeners) listener(state);
}
