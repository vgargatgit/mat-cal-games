import { test, equal, ok } from './test-utils.js';
import { roundForLevel } from '../js/data/sample-rounds.js';
import { GameEngine } from '../js/engine/game-engine.js';
import { validateRound } from '../js/engine/answer-validator.js';
import { roundStageRange } from '../js/engine/stage-validator.js';
import { createDefaultState, gameState } from '../js/state.js';

test('guided levels 1 through 4 expose progressive stage slices', () => {
  equal([1, 2, 3, 4].map(level => roundStageRange(roundForLevel(level))), [
    { start:0, end:0 },
    { start:1, end:1 },
    { start:2, end:2 },
    { start:3, end:4 }
  ]);
});

test('guided levels 2 through 4 deliberately share one circuit', () => {
  const rounds = [2, 3, 4].map(level => roundForLevel(level));
  equal(rounds.map(round => round.expression), ['y=\\sin(x^2)', 'y=\\sin(x^2)', 'y=\\sin(x^2)']);
  equal(rounds.map(round => round.graph.edges.map(edge => `${edge.from}->${edge.to}`)), [
    ['x->u', 'u->y'],
    ['x->u', 'u->y'],
    ['x->u', 'u->y']
  ]);
});

test('non-guided modes retain the complete five-stage workflow', () => {
  equal(roundStageRange(roundForLevel(2, 'repair')), { start:0, end:4 });
  equal(roundStageRange(roundForLevel(3, 'mastery')), { start:0, end:4 });
});

test('a focused round starts at its target with prerequisites supplied', () => {
  const root = createDefaultState();
  const round = roundForLevel(3);
  new GameEngine(root).beginRound(round);
  const current = gameState(root).currentRound;
  equal(current.stage, 2);
  equal(current.partial.assignments, round.assignments);
  equal(current.partial.connections, ['x->u', 'u->y']);
  equal(current.partial.derivativeMap, {});
});

test('resuming an older guided save applies the new focus and prerequisites', () => {
  const root = createDefaultState();
  const engine = new GameEngine(root);
  const round = roundForLevel(3);
  engine.beginRound({ ...round, stageStart:undefined, stageEnd:undefined });
  gameState(root).currentRound.lastResult = { allCorrect:false };
  engine.resumeRound(round);
  const current = gameState(root).currentRound;
  equal(current.stage, 2);
  equal(current.partial.assignments, round.assignments);
  equal(current.partial.connections, ['x->u', 'u->y']);
  equal(current.lastResult, undefined);
});

test('focused connection level validates only its learner-owned stage', () => {
  const root = createDefaultState();
  const round = roundForLevel(2);
  const engine = new GameEngine(root);
  engine.beginRound(round);
  engine.patchPartial({ connections:['x->u', 'u->y'] });
  const result = validateRound(round, gameState(root).currentRound.partial);
  ok(result.allCorrect);
  equal(Object.keys(result.checks), ['graphConnections']);
  equal(result.finalCorrect, null);
  equal(Object.keys(result.stages), ['graphNodes', 'graphConnections', 'forwardValues']);
});

test('focused connection level still rejects an incorrect circuit', () => {
  const round = roundForLevel(2);
  const result = validateRound(round, { connections:['x->y'] });
  equal(result.allCorrect, false);
  equal(result.misconception, 'graph-connection');
});
