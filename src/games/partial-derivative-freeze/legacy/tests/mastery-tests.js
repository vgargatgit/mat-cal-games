import { test, equal, assert } from './test-utils.js';
import { createConceptMastery, calculateMasteryState, createMasteryMap, updateMasteryMap, overallMastery } from '../js/engine/mastery.js';
import { SAMPLE_ROUNDS } from '../js/data/levels.js';

export const masteryTests = [
  test('new concepts are not introduced', () => equal(calculateMasteryState(createConceptMastery()), 'not-introduced')),
  test('strong recent performance reaches mastery', () => {
    const item = { ...createConceptMastery(), attempts: 6, correct: 6, firstAttemptCorrect: 3, recentResults: [true, true, true, true, true], contextsSeen: ['a', 'b'] };
    equal(calculateMasteryState(item), 'mastered');
  }),
  test('repeated recent failures need review', () => {
    const item = { ...createConceptMastery(), attempts: 5, correct: 1, recentResults: [false, false, true, false, false], contextsSeen: ['a'] };
    equal(calculateMasteryState(item), 'needs-review');
  }),
  test('round result updates multiple concepts', () => {
    const round = SAMPLE_ROUNDS.find((item) => item.id === 'sample-002');
    const next = updateMasteryMap(createMasteryMap(), round, { correct: true, misconceptions: [] }, { hintsUsed: 0, attemptNumber: 1 });
    equal(next['active-variable'].attempts, 1);
    equal(next['preserving-frozen-multipliers'].correct, 1);
  }),
  test('overall mastery is bounded', () => {
    const value = overallMastery(createMasteryMap());
    assert(value >= 0 && value <= 100);
  })
];
