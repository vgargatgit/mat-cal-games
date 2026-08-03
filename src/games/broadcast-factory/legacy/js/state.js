import { loadState, saveState } from './storage.js';

let persisted = loadState();
const listeners = new Set();

export const runtime = {
  view: 'welcome',
  tutorialStep: 0,
  round: null,
  phase: 'operation',
  results: {},
  hintsUsed: 0,
  feedback: null,
  dependencyDraft: [],
  answerAttempt: 1,
  selectedLevel: null,
  draft: {},
  misconceptionsSeen: []
};

export function getPersisted() { return persisted; }
export function getGame() { return persisted.learner.games.broadcastFactory; }
export function getSettings() { return persisted.learner.settings; }

export function updatePersisted(mutator) {
  const next = structuredClone(persisted);
  mutator(next);
  persisted = next;
  saveState(persisted);
  notify();
}

export function replacePersisted(next) { persisted = next; saveState(persisted); notify(); }
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function notify() { for (const listener of listeners) listener(); }
