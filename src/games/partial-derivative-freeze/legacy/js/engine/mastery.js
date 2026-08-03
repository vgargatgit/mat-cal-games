export const MASTERY_CONCEPTS = [
  'active-variable', 'numerical-constants', 'freezing-independent-inputs', 'preserving-frozen-multipliers',
  'detecting-independent-terms', 'constant-multiple', 'sum-difference', 'product-rule', 'chain-rule',
  'declared-dependencies', 'partial-versus-total', 'multiple-paths', 'gradient-assembly', 'neuron-local-derivatives'
];

export function createConceptMastery() {
  return {
    attempts: 0, correct: 0, firstAttemptCorrect: 0, hintsUsed: 0, recentResults: [], misconceptionCounts: {},
    lastPractisedAt: null, contextsSeen: [], masteryState: 'not-introduced'
  };
}

export function createMasteryMap() {
  return Object.fromEntries(MASTERY_CONCEPTS.map((id) => [id, createConceptMastery()]));
}

export function conceptsForRound(round) {
  const concepts = ['active-variable'];
  if ((round.expectedAnswer?.frozenVariables || []).length) concepts.push('freezing-independent-inputs');
  if ((round.expectedAnswer?.frozenVariables || []).some((name) => JSON.stringify(round.expectedAnswer.derivativeAst || {}).includes(`\"name\":\"${name}\"`))) concepts.push('preserving-frozen-multipliers');
  if ((round.expectedAnswer?.termDependencies || []).some((term) => !term.dependsOnActiveVariable)) concepts.push('detecting-independent-terms');
  if (round.rules?.includes('constant-multiple')) concepts.push('constant-multiple');
  if (round.rules?.includes('sum')) concepts.push('sum-difference');
  if (round.rules?.includes('product')) concepts.push('product-rule');
  if (round.rules?.includes('chain')) concepts.push('chain-rule');
  if (round.derivativeType === 'total') concepts.push('declared-dependencies', 'partial-versus-total');
  if (round.rules?.includes('path-sum')) concepts.push('multiple-paths');
  if (round.taskKind === 'gradient') concepts.push('gradient-assembly');
  if (round.level === 10) concepts.push('neuron-local-derivatives');
  return [...new Set(concepts)];
}

export function updateMasteryMap(mastery, round, result, answer) {
  const now = new Date().toISOString();
  const next = structuredClone(mastery);
  conceptsForRound(round).forEach((concept) => {
    const item = next[concept] || createConceptMastery();
    item.attempts += 1;
    if (result.correct) item.correct += 1;
    if (result.correct && (answer.attemptNumber || 1) === 1) item.firstAttemptCorrect += 1;
    item.hintsUsed += answer.hintsUsed || 0;
    item.recentResults = [...item.recentResults, result.correct].slice(-5);
    result.misconceptions.forEach((id) => { item.misconceptionCounts[id] = (item.misconceptionCounts[id] || 0) + 1; });
    item.lastPractisedAt = now;
    const context = round.taskKind || round.metadata?.family || `level-${round.level}`;
    if (!item.contextsSeen.includes(context)) item.contextsSeen.push(context);
    item.masteryState = calculateMasteryState(item);
    next[concept] = item;
  });
  return next;
}

export function calculateMasteryState(item) {
  if (!item.attempts) return 'not-introduced';
  if (item.attempts < 2) return 'introduced';
  const recentAccuracy = item.recentResults.filter(Boolean).length / item.recentResults.length;
  const criticalRecentFailures = item.recentResults.slice(-3).filter((value) => !value).length;
  if (item.attempts >= 5 && recentAccuracy >= 0.8 && item.firstAttemptCorrect >= 2 && item.contextsSeen.length >= 2 && criticalRecentFailures === 0) return 'mastered';
  if (recentAccuracy >= 0.8) return 'proficient';
  if (item.attempts >= 4 && recentAccuracy < 0.5) return 'needs-review';
  return 'practising';
}

export function overallMastery(mastery) {
  const introduced = Object.values(mastery).filter((item) => item.masteryState !== 'not-introduced');
  if (!introduced.length) return 0;
  const values = { introduced: 0.2, practising: 0.45, proficient: 0.75, mastered: 1, 'needs-review': 0.3 };
  return Math.round(100 * introduced.reduce((sum, item) => sum + (values[item.masteryState] || 0), 0) / introduced.length);
}

export function strongestWeakness(mastery) {
  const counts = {};
  Object.values(mastery).forEach((item) => Object.entries(item.misconceptionCounts || {}).forEach(([id, count]) => { counts[id] = (counts[id] || 0) + count; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
