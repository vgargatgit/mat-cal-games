const conceptMap = {
  'vector-plus-scalar': ['scalar-expansion','broadcast-addition','ones-vector-derivative','identity-jacobian'],
  'scalar-plus-vector': ['scalar-expansion','broadcast-addition','ones-vector-derivative','identity-jacobian'],
  'vector-minus-scalar': ['scalar-expansion','broadcast-subtraction','ones-vector-derivative'],
  'scalar-minus-vector': ['scalar-expansion','broadcast-subtraction','scaled-identity'],
  'scalar-times-vector': ['scalar-vector-multiplication','scaled-identity','vector-output-scalar-input'],
  'vector-times-scalar': ['scalar-vector-multiplication','scaled-identity','vector-output-scalar-input'],
  'vector-plus-vector': ['elementwise-addition','identity-jacobian','shared-vs-feature-parameters'],
  'elementwise-multiply': ['elementwise-multiplication','diagonal-jacobian','shared-vs-feature-parameters'],
  'dot-product': ['dot-product-distinction','reduction-shape'],
  'matrix-vector': ['matrix-multiplication-distinction','dense-jacobian'],
  'shared-scale-shift': ['scale-shift','shared-vs-feature-parameters'],
  'per-feature-scale-shift': ['scale-shift','diagonal-jacobian','shared-vs-feature-parameters']
};

export function emptyConceptMastery() {
  return { attempts: 0, correct: 0, firstAttemptCorrect: 0, hintsUsed: 0, recentResults: [], misconceptionCounts: {}, contextsSeen: [], lastPractisedAt: null, masteryState: 'not-introduced' };
}

export function conceptsForRound(round) { return conceptMap[round.operationType] ?? ['operation-classification']; }

export function updateMastery(mastery, round, { correct, firstAttempt, hintsUsed, misconceptions = [] }) {
  const next = structuredClone(mastery ?? {});
  for (const concept of conceptsForRound(round)) {
    const item = next[concept] ?? emptyConceptMastery();
    item.attempts += 1;
    if (correct) item.correct += 1;
    if (correct && firstAttempt) item.firstAttemptCorrect += 1;
    item.hintsUsed += hintsUsed;
    item.recentResults = [...item.recentResults, Boolean(correct)].slice(-5);
    for (const misconception of misconceptions.filter(Boolean)) item.misconceptionCounts[misconception] = (item.misconceptionCounts[misconception] ?? 0) + 1;
    if (!item.contextsSeen.includes(round.operationType)) item.contextsSeen.push(round.operationType);
    item.lastPractisedAt = new Date().toISOString();
    const recentAccuracy = item.recentResults.filter(Boolean).length / item.recentResults.length;
    item.masteryState = item.attempts >= 5 && recentAccuracy >= 0.8 ? 'mastered' : item.attempts >= 2 ? 'practising' : 'introduced';
    next[concept] = item;
  }
  return next;
}

export function overallMastery(mastery) {
  const values = Object.values(mastery ?? {});
  if (!values.length) return 0;
  const score = values.reduce((sum, item) => {
    const accuracy = item.attempts ? item.correct / item.attempts : 0;
    const evidence = Math.min(1, item.attempts / 5);
    return sum + accuracy * evidence;
  }, 0);
  return Math.round(score / values.length * 100);
}

export function mostFrequentMisconception(mastery) {
  const counts = {};
  for (const item of Object.values(mastery ?? {})) for (const [key, value] of Object.entries(item.misconceptionCounts ?? {})) counts[key] = (counts[key] ?? 0) + value;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
