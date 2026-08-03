import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyConceptMastery, updateConceptMastery, calculateMasteryState } from '../js/engine/mastery.js';

test('mastery requires repeated success across contexts', () => {
  let data = emptyConceptMastery();
  const contexts = ['shape', 'bug', 'shape', 'bug', 'shape'];
  for (const context of contexts) {
    data = updateConceptMastery(data, { correct: true, firstAttempt: true, hintsUsed: 0, context });
  }
  assert.equal(calculateMasteryState(data), 'mastered');
});

test('low recent accuracy requests review', () => {
  let data = emptyConceptMastery();
  data = updateConceptMastery(data, { correct: false, firstAttempt: false, hintsUsed: 1, context: 'shape', misconception: 'reversed-jacobian' });
  data = updateConceptMastery(data, { correct: false, firstAttempt: false, hintsUsed: 1, context: 'shape', misconception: 'reversed-jacobian' });
  assert.equal(data.masteryState, 'needs-review');
  assert.equal(data.misconceptions['reversed-jacobian'], 2);
});
