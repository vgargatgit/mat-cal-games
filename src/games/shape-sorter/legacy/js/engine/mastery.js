export function emptyConceptMastery() {
  return {
    attempts: 0,
    correct: 0,
    firstAttemptCorrect: 0,
    hintsUsed: 0,
    recentResults: [],
    contexts: [],
    misconceptions: {},
    lastPractisedAt: null,
    masteryState: 'not-introduced'
  };
}

export function updateConceptMastery(current, result) {
  const next = structuredClone(current ?? emptyConceptMastery());
  next.attempts += 1;
  next.correct += result.correct ? 1 : 0;
  next.firstAttemptCorrect += result.correct && result.firstAttempt ? 1 : 0;
  next.hintsUsed += result.hintsUsed ?? 0;
  next.recentResults = [...next.recentResults, Boolean(result.correct)].slice(-8);
  if (result.context && !next.contexts.includes(result.context)) next.contexts.push(result.context);
  if (result.misconception) next.misconceptions[result.misconception] = (next.misconceptions[result.misconception] ?? 0) + 1;
  next.lastPractisedAt = new Date().toISOString();
  next.masteryState = calculateMasteryState(next);
  return next;
}

export function calculateMasteryState(data) {
  if (!data || data.attempts === 0) return 'not-introduced';
  const recentAccuracy = data.recentResults.length ? data.recentResults.filter(Boolean).length / data.recentResults.length : 0;
  if (data.attempts >= 5 && recentAccuracy >= .8 && data.firstAttemptCorrect >= 2 && data.contexts.length >= 2) return 'mastered';
  if (data.attempts >= 4 && recentAccuracy >= .7) return 'proficient';
  if (data.attempts >= 2) return recentAccuracy < .5 ? 'needs-review' : 'practising';
  return 'introduced';
}

export function masteryPercent(mastery) {
  const values = Object.values(mastery ?? {});
  if (values.length === 0) return 0;
  const weights = { 'not-introduced': 0, introduced: 20, practising: 45, 'needs-review': 35, proficient: 75, mastered: 100 };
  return Math.round(values.reduce((sum, item) => sum + (weights[item.masteryState] ?? 0), 0) / values.length);
}
