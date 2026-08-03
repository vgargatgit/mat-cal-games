export const SCORE_WEIGHTS = Object.freeze({ operation: 15, outputShape: 15, forward: 20, dependencies: 20, derivativeShape: 20, derivative: 30, structure: 15, repair: 20 });

export function calculateRoundScore(results, { hintsUsed = 0, attemptNumber = 1 } = {}) {
  const base = Object.values(results).reduce((sum, result) => sum + (result?.points ?? 0), 0);
  const firstAttemptBonus = attemptNumber === 1 && Object.values(results).every((result) => result?.correct) ? 20 : 0;
  const noHintBonus = hintsUsed === 0 ? 10 : 0;
  return Math.round(base + firstAttemptBonus + noHintBonus);
}
