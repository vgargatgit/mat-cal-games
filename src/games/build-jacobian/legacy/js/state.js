import { loadStore, saveStore, resetStore, gameState } from './storage.js';
import { recordConceptResult, overallMastery } from './engine/mastery.js';

const STAGE_CONCEPTS = {
  shape: ['jacobian-shape'],
  labels: ['row-output-mapping', 'column-input-mapping'],
  locate: ['entry-notation'],
  dependencies: ['dependency-map', 'structural-zeros'],
  build: ['partial-derivative-calculation', 'correct-cell-placement'],
  classify: ['jacobian-classification'],
  interpret: ['entry-interpretation', 'row-interpretation', 'column-interpretation'],
};

export class AppState {
  constructor() {
    this.store = loadStore();
  }

  get game() { return gameState(this.store); }
  get settings() { return this.store.learner.settings; }
  get masteryPercent() { return overallMastery(this.game.mastery); }

  persist() { saveStore(this.store); }

  saveCurrentRound(round, engine) {
    this.game.currentRound = {
      id: round.id,
      seed: round.seed ?? null,
      level: round.level,
      generated: Boolean(round.generated),
      family: round.family || null,
      engineState: engine.serialize(),
    };
    this.game.progress.currentLevel = Math.max(1, Math.min(14, round.level));
    this.persist();
  }

  clearCurrentRound() {
    this.game.currentRound = null;
    this.persist();
  }

  recordStage(round, stage, result, engine) {
    const concepts = [...new Set([...(STAGE_CONCEPTS[stage] || []), ...(round.concepts || [])])];
    for (const concept of concepts) {
      recordConceptResult(this.game.mastery, concept, {
        correct: Boolean(result.ok),
        firstAttempt: Boolean(result.ok && (engine.state.attempts[stage] || 1) === 1),
        hintsUsed: engine.state.hintsUsed[stage] || 0,
        misconception: result.misconception || null,
        context: round.classification.rectangular ? 'rectangular' : round.classification.sparse ? 'sparse' : 'square',
      });
    }
    if (result.misconception) {
      this.game.misconceptions[result.misconception] = (this.game.misconceptions[result.misconception] || 0) + 1;
    }
    this.persist();
  }

  completeRound(round, engine) {
    if (engine.state.finalized) return;
    engine.state.finalized = true;
    const progress = this.game.progress;
    if (!progress.completedRoundIds.includes(round.id)) {
      progress.completedRoundIds.push(round.id);
      progress.roundsCompleted += 1;
      progress.totalScore += engine.state.score;
      const noFailedStages = Object.values(engine.state.attempts).every(attempts => attempts <= 1);
      if (noFailedStages) progress.firstAttemptCorrect += 1;
    }
    if (!progress.completedLevels.includes(round.level)) progress.completedLevels.push(round.level);
    progress.completedLevels.sort((a, b) => a - b);
    progress.currentLevel = Math.min(14, Math.max(progress.currentLevel, round.level + 1));
    this.game.currentRound = null;
    this.persist();
  }

  discoverConcept(id) {
    if (!this.game.conceptDiscoveries.includes(id)) {
      this.game.conceptDiscoveries.push(id);
      this.persist();
    }
  }

  markTutorialComplete() {
    this.game.tutorialCompleted = true;
    this.persist();
  }

  updateSetting(name, value) {
    if (!Object.prototype.hasOwnProperty.call(this.settings, name)) throw new Error(`Unknown setting ${name}`);
    this.settings[name] = value;
    this.persist();
  }

  replaceStore(store) {
    this.store = store;
    this.persist();
  }

  reset() {
    this.store = resetStore();
  }
}
