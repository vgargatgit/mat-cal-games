import { generateRound, hydrateSampleRound } from './question-generator.js';
import { SAMPLE_ROUNDS } from '../data/sample-rounds.js';
import { getLevel } from '../data/levels.js';
import { updateMastery } from './mastery.js';
import { calculateRoundScore } from './scoring.js';

export function nextSeed(levelId, attempt) {
  return Number(`${levelId}${String((attempt + 1) * 7919).slice(-5)}`);
}

const SAMPLE_SCHEDULE = {
  2: [0],
  5: [1, 2],
  6: [3],
  7: [4, 5],
  8: [6],
  9: [7],
  11: [12],
  12: [13],
  13: [8, 9],
  15: [10],
  16: [11]
};


function adaptiveOperation(game, levelId) {
  const mapping = {
    'scalar-output-collapse': 'vector-plus-scalar',
    'scalar-independent-copies': 'vector-plus-scalar',
    'scalar-derivative-as-scalar': 'vector-plus-scalar',
    'identity-for-scalar-derivative': 'vector-plus-scalar',
    'ones-for-scaling': 'scalar-times-vector',
    'missing-scalar-multiplier': 'scalar-times-vector',
    'dot-product-confusion': 'scalar-times-vector',
    'matrix-confusion': 'matrix-vector',
    'shared-vector-bias-confusion': 'vector-plus-scalar',
    'wrong-orientation': 'vector-plus-scalar',
    'wrong-subtraction-sign': 'vector-minus-scalar',
    'dense-broadcast-dependency': 'vector-plus-scalar'
  };
  const level = getLevel(levelId);
  const ranked = Object.entries(game.misconceptions ?? {}).sort((a, b) => b[1] - a[1]);
  for (const [misconception, count] of ranked) {
    const operation = mapping[misconception];
    if (count >= 2 && operation && (level?.families.includes(operation) || levelId >= 17)) return operation;
  }
  return null;
}

export function createRoundForProgress(game, levelId) {
  const attempt = game.progress.attemptsByLevel[levelId] ?? 0;
  const sampleIndex = SAMPLE_SCHEDULE[levelId]?.[attempt];
  if (Number.isInteger(sampleIndex)) return hydrateSampleRound(SAMPLE_ROUNDS[sampleIndex], levelId, attempt);
  return generateRound({ levelId, seed: nextSeed(levelId, attempt), attempt, forcedOperation: adaptiveOperation(game, levelId) });
}

export function completeRound(game, round, results, { hintsUsed = 0, answerAttempt = 1, misconceptionsSeen = [] } = {}) {
  const allCorrect = Object.values(results).every((result) => result?.correct);
  const misconceptions = [...new Set([...Object.values(results).map((result) => result?.misconception).filter(Boolean), ...misconceptionsSeen.filter(Boolean)])];
  const score = calculateRoundScore(results, { hintsUsed, attemptNumber: answerAttempt });
  const next = structuredClone(game);
  next.progress.score += score;
  next.progress.attemptsByLevel[round.levelId] = (next.progress.attemptsByLevel[round.levelId] ?? 0) + 1;
  if (allCorrect && !next.progress.completedLevels.includes(round.levelId)) next.progress.completedLevels.push(round.levelId);
  if (allCorrect && round.levelId < 18) next.progress.currentLevel = Math.max(next.progress.currentLevel, round.levelId + 1);
  next.mastery = updateMastery(next.mastery, round, { correct: allCorrect, firstAttempt: answerAttempt === 1, hintsUsed, misconceptions });
  for (const misconception of misconceptions) next.misconceptions[misconception] = (next.misconceptions[misconception] ?? 0) + 1;
  next.currentRound = null;
  next.partialAnswer = null;
  return { game: next, score, allCorrect, misconceptions };
}
