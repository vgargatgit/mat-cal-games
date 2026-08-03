import { test, equal, ok } from './test-utils.js';
import { createDefaultState, gameState, updateMasteryRecord } from '../js/state.js';
import { GameEngine } from '../js/engine/game-engine.js';

test('mastery progresses after five strong attempts', () => {
  const record = gameState(createDefaultState()).mastery['chain-rule'];
  for (let index = 0; index < 5; index += 1) {
    updateMasteryRecord(record, true, `case-${index}`, 0);
  }
  equal(record.masteryState, 'mastered');
});

test('mastery records misconceptions separately', () => {
  const record = gameState(createDefaultState()).mastery['chain-rule'];
  updateMasteryRecord(record, false, 'case', 0, 'added-serial');
  equal(record.misconceptionCounts['added-serial'], 1);
  ok(record.lastPractisedAt);
});

test('first-attempt correctness is recorded per round rather than only once per concept', () => {
  const record = gameState(createDefaultState()).mastery['chain-rule'];
  updateMasteryRecord(record, true, 'round-a', 0, null, true);
  updateMasteryRecord(record, false, 'round-b', 0, null, true);
  updateMasteryRecord(record, true, 'round-c', 0, null, true);
  equal(record.firstAttemptCorrect, 2);
});

test('hint counts are not duplicated across repeated submissions in one round', () => {
  const root = createDefaultState();
  const engine = new GameEngine(root);
  const round = { id:'hint-round', level:1, concepts:['chain-rule'] };
  const failed = { allCorrect:false, misconception:null };
  engine.beginRound(round);
  engine.useHint();
  engine.useHint();
  engine.recordAttempt(round, failed, { total:0 });
  engine.recordAttempt(round, failed, { total:0 });
  equal(gameState(root).mastery['chain-rule'].hintsUsed, 2);
});
