import { SAMPLE_ROUNDS, roundsForLevel } from '../data/levels.js';
import { generateQuestion } from './question-generator.js';
import { validateRoundAnswer } from './answer-validator.js';
import { updateMasteryMap, strongestWeakness } from './mastery.js';
import { computeRoundScore } from './scoring.js';

export class GameEngine {
  constructor(state) {
    this.state = state;
  }

  get game() { return this.state.learner.games.partialDerivativeFreeze; }

  nextRound(level = this.game.progress.currentLevel) {
    const numericLevel = Number(level);
    const samples = roundsForLevel(numericLevel);
    const unseen = samples.find((round) => !this.game.progress.seenRounds.includes(round.id));
    const weakness = strongestWeakness(this.game.mastery);
    const seed = (Date.now() ^ (this.game.progress.attempts * 2654435761)) >>> 0;
    const round = unseen || generateQuestion(numericLevel, seed, weakness);
    if (!unseen) round.generationWeakness = weakness;
    this.game.progress.currentLevel = numericLevel;
    this.game.currentRound = serializeRoundReference(round);
    this.game.currentAnswer = null;
    return round;
  }

  submit(round, answer) {
    const result = validateRoundAnswer(round, answer);
    const progress = this.game.progress;
    progress.attempts += 1;
    if (result.correct) {
      progress.correct += 1;
      progress.streak += 1;
      if (!progress.seenRounds.includes(round.id)) progress.seenRounds.push(round.id);
    } else {
      progress.streak = 0;
    }
    const awarded = computeRoundScore(result, answer, progress.streak);
    progress.totalScore += awarded;
    progress.lastPlayedAt = new Date().toISOString();
    this.game.mastery = updateMasteryMap(this.game.mastery, round, result, answer);
    result.misconceptions.forEach((id) => { this.game.misconceptions[id] = (this.game.misconceptions[id] || 0) + 1; });
    if (result.correct && progress.attempts >= 3) {
      const levelAttempts = progress.seenRounds.filter((id) => id.includes(`l${round.level}`) || SAMPLE_ROUNDS.some((sample) => sample.id === id && sample.level === round.level)).length;
      if (levelAttempts >= 2 && !progress.completedLevels.includes(round.level)) progress.completedLevels.push(round.level);
    }
    this.game.currentAnswer = { roundId: round.id, ...answer, submittedAt: new Date().toISOString(), correct: result.correct };
    return { ...result, awarded };
  }
}

function serializeRoundReference(round) {
  return { id: round.id, seed: round.seed, level: round.level, taskKind: round.taskKind, weakness: round.generationWeakness || null };
}
