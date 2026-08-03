import test from 'node:test';
import assert from 'node:assert/strict';
import { debugModeFromSearch, withoutDebugMode } from '../src/app/debug/debug-mode.js';

test('debug mode accepts only explicit enabled query values', () => {
  assert.equal(debugModeFromSearch('?debug=1'), true);
  assert.equal(debugModeFromSearch('?debug=TRUE'), true);
  assert.equal(debugModeFromSearch('?debug=on'), true);
  assert.equal(debugModeFromSearch('?debug=0'), false);
  assert.equal(debugModeFromSearch('?mode=debug'), false);
  assert.equal(debugModeFromSearch(''), false);
});

test('leaving debug mode removes only the debug switch and returns to the map', () => {
  assert.equal(
    withoutDebugMode('http://localhost:8081/?theme=dark&debug=1#/game/jacobian-tetris'),
    'http://localhost:8081/?theme=dark#/map',
  );
});
