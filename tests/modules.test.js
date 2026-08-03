import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CATALOG } from '../src/games/catalog.js';

test('catalog contains the eight games in curriculum order', () => {
  assert.equal(GAME_CATALOG.length, 8);
  assert.deepEqual(GAME_CATALOG.map((game) => game.order), ['01', '02', '03', '04', '05', '06', '07', '08']);
});

test('every game implements the GameModule contract', async () => {
  for (const metadata of GAME_CATALOG) {
    const game = await metadata.load();
    assert.equal(game.id, metadata.id);
    for (const property of ['title', 'description', 'difficulty']) assert.equal(typeof game[property], 'string');
    for (const method of ['create', 'destroy', 'pause', 'resume']) assert.equal(typeof game[method], 'function', `${metadata.id}.${method}`);
  }
});

test('legacy storage namespaces are unique', () => {
  const keys = GAME_CATALOG.map((game) => game.storageKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.every((key) => key.startsWith('arcade.legacy.')));
});
