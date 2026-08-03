import { gameState } from '../state.js';
import { saveState } from '../storage.js';
import { recordMastery } from './mastery.js';
import { edgeKey, expectedConnections, roundStageRange } from './stage-validator.js';

function emptyPartial() {
  return {
    assignments:[],
    connections:[],
    derivatives:[],
    derivativeMap:{},
    paths:[],
    pathProducts:{},
    factorOrder:[],
    productBuilt:false,
    accumulated:false,
    injectedGradient:false,
    finalAnswer:'',
    explanation:''
  };
}

export function prerequisitePartial(round) {
  const { start } = roundStageRange(round);
  const partial = {};
  if (start > 0) partial.assignments = [...(round.assignments ?? [])];
  if (start > 1) partial.connections = expectedConnections(round);
  if (start > 2) {
    const edges = round.graph?.edges ?? [];
    partial.derivatives = edges.map(edge => edge.localDerivative.expression);
    partial.derivativeMap = Object.fromEntries(edges.map(edge => [edgeKey(edge), edge.localDerivative.expression]));
  }
  if (start > 3) partial.paths = (round.expectedPaths ?? []).map(path => [...path]);
  return partial;
}

export class GameEngine {
  constructor(rootState) {
    this.rootState = rootState;
    this.game = gameState(rootState);
  }

  beginRound(round) {
    const { start } = roundStageRange(round);
    this.game.currentRound = {
      id:round.id,
      seed:round.seed ?? null,
      round,
      attempts:0,
      hintsUsed:0,
      recordedHintsUsed:0,
      stage:start,
      partial:{ ...emptyPartial(), ...prerequisitePartial(round) }
    };
    this.game.progress.currentLevel = round.level;
    saveState(this.rootState);
  }

  resumeRound(round) {
    const current = this.game.currentRound;
    if (!current) return;
    const previousRange = roundStageRange(current.round ?? round);
    const { start, end } = roundStageRange(round);
    const scopeChanged = previousRange.start !== start || previousRange.end !== end;
    current.round = round;
    current.stage = Math.max(start, Math.min(end, current.stage ?? start));
    current.partial = {
      ...emptyPartial(),
      ...(current.partial ?? {}),
      ...prerequisitePartial(round)
    };
    if (scopeChanged) {
      delete current.lastResult;
      delete current.lastScore;
    }
    saveState(this.rootState);
  }

  patchPartial(partial) {
    if (!this.game.currentRound) return;
    Object.assign(this.game.currentRound.partial, partial);
    saveState(this.rootState);
  }

  useHint() {
    if (!this.game.currentRound) return;
    this.game.currentRound.hintsUsed += 1;
    saveState(this.rootState);
  }

  recordAttempt(round, result, score) {
    const current = this.game.currentRound;
    const firstAttempt = current.attempts === 0;
    const hintDelta = Math.max(0, current.hintsUsed - (current.recordedHintsUsed ?? 0));
    current.recordedHintsUsed = current.hintsUsed;
    current.attempts += 1;
    current.lastResult = result;
    current.lastScore = score;
    this.game.progress.score += score.total;
    this.game.progress.currentStreak = result.allCorrect
      ? this.game.progress.currentStreak + 1
      : 0;
    this.game.progress.bestStreak = Math.max(
      this.game.progress.bestStreak,
      this.game.progress.currentStreak
    );
    if (result.misconception) {
      this.game.misconceptions[result.misconception] =
        (this.game.misconceptions[result.misconception] ?? 0) + 1;
    }
    if (result.allCorrect && !this.game.progress.completedLevels.includes(round.level)) {
      this.game.progress.completedLevels.push(round.level);
    }
    recordMastery(
      this.game,
      round,
      result.allCorrect,
      hintDelta,
      result.misconception,
      firstAttempt
    );
    saveState(this.rootState);
  }
}
