import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore, STORAGE_KEY, defaultProgress, sanitizeProgress } from '../src/app/progress/progress-store.js';
import { GAME_DATA } from '../src/games/game-data.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('invalid saved progress recovers to defaults', () => {
  assert.deepEqual(sanitizeProgress({ schemaVersion: 99 }), defaultProgress());
  assert.deepEqual(sanitizeProgress(null), defaultProgress());
});

test('completing a game unlocks the next module and concepts', () => {
  const storage = memoryStorage();
  const store = new ProgressStore(storage);
  const first = GAME_DATA[0];
  assert.equal(store.isUnlocked(1), false);
  assert.equal(store.completeGame(first, 0, { stars: 3, score: 900, hintsUsed: 0 }), true);
  assert.equal(store.isUnlocked(1), true);
  assert.equal(store.state.stars[first.id], 3);
  assert.ok(store.state.completedConcepts.includes('derivative shapes'));
  assert.ok(store.state.achievements['Shape Master']);
  assert.ok(storage.getItem(STORAGE_KEY));
});

test('completion is idempotent and preserves the best result', () => {
  const store = new ProgressStore(memoryStorage());
  const first = GAME_DATA[0];
  store.completeGame(first, 0, { stars: 3, score: 1000, hintsUsed: 1 });
  assert.equal(store.completeGame(first, 0, { stars: 1, score: 200, hintsUsed: 2 }), false);
  assert.equal(store.state.completedGames.length, 1);
  assert.equal(store.state.stars[first.id], 3);
  assert.equal(store.state.bestScore[first.id], 1000);
});

test('free play unlocks without mutating progression', () => {
  const store = new ProgressStore(memoryStorage());
  assert.equal(store.isUnlocked(7, true), true);
  assert.equal(store.state.unlockedLevel, 0);
});
