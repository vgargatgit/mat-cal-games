import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CATALOG } from '../src/games/catalog.js';
import { GAME_TUTORIALS, tutorialForGame } from '../src/games/game-tutorials.js';
import { TUTORIAL_STORAGE_KEY, TutorialStore } from '../src/app/tutorial/tutorial-store.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('every arcade game has one complete shared tutorial', () => {
  assert.equal(Object.keys(GAME_TUTORIALS).length, GAME_CATALOG.length);
  for (const game of GAME_CATALOG) {
    const tutorial = tutorialForGame(game.id);
    assert.ok(tutorial, `${game.id} tutorial`);
    assert.equal(tutorial.steps.length, 4, `${game.id} step count`);
    for (const step of tutorial.steps) {
      assert.equal(typeof step.title, 'string');
      assert.ok(step.title.length > 3);
      assert.equal(typeof step.icon, 'string');
      assert.ok(step.paragraphs?.length || step.bullets?.length || step.rules?.length || step.callout);
    }
  }
});

test('tutorial completion is namespaced, persistent, and resettable', () => {
  const storage = memoryStorage();
  const store = new TutorialStore(storage);
  assert.equal(store.hasSeen('shape-sorter'), false);
  store.markSeen('shape-sorter');
  assert.equal(new TutorialStore(storage).hasSeen('shape-sorter'), true);
  assert.deepEqual(JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY)), { schemaVersion: 1, seen: ['shape-sorter'] });
  store.reset();
  assert.equal(store.hasSeen('shape-sorter'), false);
});

test('existing ReLU tutorial completion migrates into the shared tutorial store', () => {
  const storage = memoryStorage({ 'arcade.training.relu-gatekeeper.v1': JSON.stringify({ schemaVersion: 1, tutorialSeen: true }) });
  assert.equal(new TutorialStore(storage).hasSeen('relu-gatekeeper'), true);
});

test('ReLU tutorial introduces the full chain-rule product before isolating the gate factor', () => {
  const tutorial = tutorialForGame('relu-gatekeeper');
  const introduction = tutorial.steps[0].paragraphs.join(' ');
  assert.match(introduction, /∂L\/∂z = \(∂L\/∂a\) × ReLU′\(z\)/);
  assert.match(introduction, /sign of z/);
  assert.match(tutorial.steps[0].callout, /incoming ∂L\/∂a factor/);
  assert.match(tutorial.steps[2].bullets.join(' '), /other factor/);
});
