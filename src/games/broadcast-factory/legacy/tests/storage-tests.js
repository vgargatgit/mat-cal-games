import { defaultGameState, validateImportedState, saveState, loadState, importState } from '../js/storage.js';

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}

export async function registerStorageTests(t) {
  await t.test('default state validates', () => t.assert(validateImportedState(defaultGameState()).valid, 'Default state invalid'));
  await t.test('state round trips through storage', () => {
    const storage = new MemoryStorage(); const state = defaultGameState(); state.learner.games.broadcastFactory.progress.score = 42; saveState(state, storage); t.equal(loadState(storage).learner.games.broadcastFactory.progress.score, 42);
  });
  await t.test('corrupted state recovers safely', () => { const storage = new MemoryStorage(); storage.setItem('matrixCalculusSuite.progress.v1', '{bad'); t.equal(loadState(storage).schemaVersion, 1); });
  await t.test('invalid import is rejected', () => { let failed = false; try { importState('{"schemaVersion":99}'); } catch { failed = true; } t.assert(failed, 'Invalid schema accepted'); });
}
