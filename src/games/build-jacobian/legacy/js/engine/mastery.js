const RECENT_WINDOW = 8;

export function emptyConceptRecord() {
  return {
    attempts: 0,
    correct: 0,
    firstAttemptCorrect: 0,
    hintsUsed: 0,
    recentResults: [],
    misconceptionCounts: {},
    contextsSeen: [],
    lastPractisedAt: null,
    masteryState: 'not-introduced',
  };
}

export function recordConceptResult(mastery, concept, result) {
  const current = { ...emptyConceptRecord(), ...(mastery[concept] || {}) };
  current.attempts += 1;
  if (result.correct) current.correct += 1;
  if (result.correct && result.firstAttempt) current.firstAttemptCorrect += 1;
  current.hintsUsed += result.hintsUsed || 0;
  current.recentResults = [...current.recentResults, Boolean(result.correct)].slice(-RECENT_WINDOW);
  if (result.misconception) {
    current.misconceptionCounts[result.misconception] = (current.misconceptionCounts[result.misconception] || 0) + 1;
  }
  if (result.context && !current.contextsSeen.includes(result.context)) current.contextsSeen.push(result.context);
  current.lastPractisedAt = new Date().toISOString();
  current.masteryState = determineMasteryState(current);
  mastery[concept] = current;
  return current;
}

export function determineMasteryState(record) {
  if (record.attempts === 0) return 'not-introduced';
  const recentAccuracy = record.recentResults.length ? record.recentResults.filter(Boolean).length / record.recentResults.length : 0;
  if (record.attempts >= 5 && recentAccuracy >= 0.8 && record.firstAttemptCorrect >= 2) return 'mastered';
  if (record.attempts >= 3 && recentAccuracy >= 0.6) return 'developing';
  return 'introduced';
}

export function overallMastery(mastery) {
  const records = Object.values(mastery);
  if (records.length === 0) return 0;
  const weights = { 'not-introduced': 0, introduced: 0.35, developing: 0.68, mastered: 1 };
  return Math.round(records.reduce((sum, record) => sum + (weights[record.masteryState] || 0), 0) / records.length * 100);
}

export function mostCommonMisconception(misconceptions) {
  const entries = Object.entries(misconceptions || {}).sort((a, b) => b[1] - a[1]);
  return entries[0] || null;
}

export function recommendedReview(game) {
  const misconception = mostCommonMisconception(game.misconceptions);
  if (misconception) {
    const recommendations = {
      'reversed-dimensions': { level: 7, text: 'Review rectangular Jacobians to reinforce outputs × inputs.' },
      'wrong-cell': { level: 3, text: 'Review cell-location drills. Your derivative may be right but its row or column is not.' },
      'transpose': { level: 13, text: 'Review Bug Hunter rounds focused on numerator-layout transposes.' },
      'false-zero': { level: 10, text: 'Review dependency maps before calculating derivative values.' },
      'evaluated-zero': { level: 11, text: 'Review symbolic versus evaluated zero comparisons.' },
    };
    return recommendations[misconception[0]] || { level: game.progress.currentLevel, text: `Review the current level to address ${misconception[0]}.` };
  }
  return { level: Math.max(1, game.progress.currentLevel), text: 'Continue with the next incomplete level.' };
}
