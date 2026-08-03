import { CONCEPTS } from './data/concepts.js';

export const SCHEMA_VERSION = 1;
export const GAME_KEY = 'chainRuleCircuit';

export function createConceptMastery() {
  return Object.fromEntries(CONCEPTS.map(concept => [concept.id, {
    attempts:0, correct:0, firstAttemptCorrect:0, hintsUsed:0, recentResults:[], misconceptionCounts:{}, contextsSeen:[], lastPractisedAt:null, masteryState:'not-introduced'
  }]));
}

export function createDefaultState() {
  return { schemaVersion:SCHEMA_VERSION, learner:{ games:{ [GAME_KEY]:{ progress:{currentLevel:1,completedLevels:[],score:0,currentStreak:0,bestStreak:0},mastery:createConceptMastery(),misconceptions:{},currentRound:null,tutorialCompleted:false,conceptDiscoveries:[] } },settings:{largeText:false,reducedMotion:false} } };
}

export function gameState(rootState) { return rootState.learner.games[GAME_KEY]; }

export function overallMastery(game) {
  const records=Object.values(game.mastery); if(!records.length)return 0;
  return Math.round(records.reduce((sum,item)=>sum+(item.attempts?item.correct/item.attempts:0),0)/records.length*100);
}

export function updateMasteryRecord(
  record,
  correct,
  context,
  hintsUsed = 0,
  misconception = null,
  firstAttempt = false
) {
  record.attempts += 1;
  record.correct += correct ? 1 : 0;
  record.firstAttemptCorrect += correct && firstAttempt ? 1 : 0;
  record.hintsUsed += hintsUsed;
  record.recentResults = [...record.recentResults, correct].slice(-5);
  record.contextsSeen = [...new Set([...record.contextsSeen, context])];
  record.lastPractisedAt = new Date().toISOString();
  if (misconception) {
    record.misconceptionCounts[misconception] = (record.misconceptionCounts[misconception] ?? 0) + 1;
  }
  const accuracy = record.recentResults.filter(Boolean).length / record.recentResults.length;
  record.masteryState = record.attempts >= 5 && accuracy >= .8 && record.hintsUsed <= record.attempts
    ? 'mastered'
    : record.attempts >= 2
      ? 'practising'
      : 'introduced';
}
