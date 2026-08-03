export const SCORE_RULES = {
  shape: 20,
  rowLabels: 15,
  columnLabels: 15,
  dependencies: 25,
  cellValue: 15,
  cellPlacement: 15,
  classification: 20,
  interpretation: 15,
  firstAttemptBonus: 20,
  noHintBonus: 10,
  streakMax: 25,
};

export function scoreStage(stage, result, context = {}) {
  const attempts = Math.max(1, context.attempts || 1);
  const hints = Math.max(0, context.hints || 0);
  const base = {
    shape: SCORE_RULES.shape,
    labels: SCORE_RULES.rowLabels + SCORE_RULES.columnLabels,
    dependencies: SCORE_RULES.dependencies,
    build: (result.correctCells || 0) * (SCORE_RULES.cellValue + SCORE_RULES.cellPlacement),
    classify: SCORE_RULES.classification,
    interpret: SCORE_RULES.interpretation,
    locate: SCORE_RULES.cellPlacement,
  }[stage] || 0;
  if (!result.ok && stage !== 'build') return 0;
  let score = Math.round(base / attempts);
  if (result.ok && attempts === 1) score += SCORE_RULES.firstAttemptBonus;
  if (result.ok && hints === 0) score += SCORE_RULES.noHintBonus;
  score += Math.min(SCORE_RULES.streakMax, Math.max(0, context.streak || 0) * 5);
  return score;
}
