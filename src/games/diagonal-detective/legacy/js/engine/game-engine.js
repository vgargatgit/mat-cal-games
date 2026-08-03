import { gameState } from '../state.js';
import { saveState } from '../storage.js';
import { updateMastery } from './mastery.js';

export class GameEngine {
  constructor(rootState) { this.rootState = rootState; }
  get game() { return gameState(this.rootState); }
  setCurrentCase(item) {
    this.game.progress.currentCaseId = item.id;
    this.game.progress.currentLevel = item.level;
    this.game.currentRound = { caseId:item.id, seed:item.seed, answer:null, hintsUsed:0, attempts:0, startedAt:new Date().toISOString() };
    saveState(this.rootState);
  }
  saveDraft(answer) {
    if (!this.game.currentRound) return;
    this.game.currentRound.answer = answer;
    saveState(this.rootState);
  }
  useHint() {
    if (!this.game.currentRound) return 0;
    this.game.currentRound.hintsUsed += 1;
    saveState(this.rootState);
    return this.game.currentRound.hintsUsed;
  }
  recordAttempt(item, result, score) {
    const round = this.game.currentRound ?? { attempts:0,hintsUsed:0 };
    round.attempts += 1;
    this.game.progress.attempts += 1;
    this.game.progress.score += score.total;
    const firstAttempt = round.attempts === 1;
    if (result.allCorrect) {
      this.game.progress.currentStreak += 1;
      this.game.progress.bestStreak = Math.max(this.game.progress.bestStreak, this.game.progress.currentStreak);
      if (!this.game.progress.completedCases.includes(item.id)) this.game.progress.completedCases.push(item.id);
      if (!this.game.progress.completedLevels.includes(item.level)) this.game.progress.completedLevels.push(item.level);
      this.game.progress.currentLevel = Math.min(17, item.level + 1);
    } else {
      this.game.progress.currentStreak = 0;
    }
    if (result.misconception) this.game.misconceptions[result.misconception] = (this.game.misconceptions[result.misconception] ?? 0) + 1;
    this.game.mastery = updateMastery(this.game.mastery, item.concepts, { correct:result.allCorrect, firstAttempt, hintsUsed:round.hintsUsed>0, misconception:result.misconception, context:item.mode });
    for (const concept of item.concepts) if (!this.game.conceptDiscoveries.includes(concept)) this.game.conceptDiscoveries.push(concept);
    this.game.currentRound = { ...round, attempts:round.attempts, lastResult:result, lastScore:score };
    saveState(this.rootState);
    return { firstAttempt };
  }
}
