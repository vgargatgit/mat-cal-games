import { updateMasteryRecord } from '../state.js';

export function recordMastery(
  game,
  round,
  correct,
  hintsUsed = 0,
  misconception = null,
  firstAttempt = false
) {
  (round.concepts ?? []).forEach(concept => {
    if (game.mastery[concept]) {
      updateMasteryRecord(
        game.mastery[concept],
        correct,
        round.id,
        hintsUsed,
        misconception,
        firstAttempt
      );
    }
  });
}

export function recommendedReview(game) {
  const entries = Object.entries(game.mastery);
  entries.sort(([, a], [, b]) => {
    const aAccuracy = a.attempts ? a.correct / a.attempts : 1;
    const bAccuracy = b.attempts ? b.correct / b.attempts : 1;
    return aAccuracy - bAccuracy;
  });
  return entries[0]?.[0] ?? 'single-path';
}
