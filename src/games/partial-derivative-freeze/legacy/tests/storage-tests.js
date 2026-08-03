import { test, equal, assert } from './test-utils.js';
import { createInitialState } from '../js/state.js';
import { migrateAndValidate, exportState, importState } from '../js/storage.js';

export const storageTests = [
  test('valid state round-trips', () => {
    const state = createInitialState();
    state.learner.games.partialDerivativeFreeze.progress.totalScore = 42;
    const restored = migrateAndValidate(JSON.parse(exportState(state)));
    equal(restored.learner.games.partialDerivativeFreeze.progress.totalScore, 42);
  }),
  test('corrupted numeric fields are sanitized', () => {
    const state = createInitialState();
    state.learner.games.partialDerivativeFreeze.progress.attempts = -100;
    const restored = migrateAndValidate(state);
    equal(restored.learner.games.partialDerivativeFreeze.progress.attempts, 0);
  }),
  test('unknown top-level input recovers safely', () => {
    const restored = migrateAndValidate({ nope: true });
    equal(restored.schemaVersion, 1);
  }),
  test('import rejects newer schema', () => {
    let rejected = false;
    try { migrateAndValidate({ schemaVersion: 999, learner: { games: { partialDerivativeFreeze: {} } } }); } catch { rejected = true; }
    assert(rejected);
  })
];
