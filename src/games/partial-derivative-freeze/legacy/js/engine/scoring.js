export function computeRoundScore(result, answer, streak = 0) {
  const base = result.score || 0;
  const explanationBonus = answer.explanationChoice === 'correct' ? 15 : 0;
  const streakBonus = Math.min(25, Math.max(0, streak) * 5);
  return base + explanationBonus + streakBonus;
}

export function accuracy(progress) {
  return progress.attempts ? progress.correct / progress.attempts : 0;
}
