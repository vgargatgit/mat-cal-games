import { createMasteryMap } from './engine/mastery.js';

export const SCHEMA_VERSION = 1;

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    learner: {
      games: {
        partialDerivativeFreeze: {
          progress: { currentLevel: 1, completedLevels: [], attempts: 0, correct: 0, totalScore: 0, streak: 0, tutorialComplete: false, seenRounds: [], lastPlayedAt: null },
          mastery: createMasteryMap(),
          misconceptions: {},
          currentRound: null,
          currentAnswer: null,
          notebookDiscoveries: []
        }
      },
      settings: { reducedMotion: false, largeText: false, sound: false }
    }
  };
}

export function gameState(state) {
  return state.learner.games.partialDerivativeFreeze;
}
