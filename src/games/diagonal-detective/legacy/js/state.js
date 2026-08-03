import { createConceptMastery } from './engine/mastery.js';

export const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    learner: {
      games: {
        diagonalDetective: {
          progress: { currentLevel: 1, currentCaseId: 'find-evidence', completedLevels: [], completedCases: [], score: 0, bestStreak: 0, currentStreak: 0, attempts: 0 },
          mastery: {},
          misconceptions: {},
          currentRound: null,
          tutorialCompleted: false,
          conceptDiscoveries: []
        }
      },
      settings: { reducedMotion: false, largeText: false }
    }
  };
}

export function gameState(rootState) {
  return rootState.learner.games.diagonalDetective;
}

export function ensureConcept(rootState, concept) {
  const game = gameState(rootState);
  if (!game.mastery[concept]) game.mastery[concept] = createConceptMastery();
  return game.mastery[concept];
}
