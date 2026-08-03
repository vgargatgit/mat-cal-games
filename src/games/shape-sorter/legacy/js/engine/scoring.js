export function scoreRound({ firstAttempt, hintsUsed, reasonCompleted, streak }) {
  const classification = 40;
  const dimensions = 40;
  const reasoning = reasonCompleted ? 20 : 10;
  const firstAttemptBonus = firstAttempt ? 20 : 0;
  const noHintBonus = hintsUsed === 0 ? 10 : 0;
  const streakBonus = Math.min(25, Math.max(0, streak - 1) * 5);
  return classification + dimensions + reasoning + firstAttemptBonus + noHintBonus + streakBonus;
}
