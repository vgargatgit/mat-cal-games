import { createInitialState, SCHEMA_VERSION } from './state.js';

const STORAGE_KEY = 'arcade.legacy.partial-derivative-freeze.v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return migrateAndValidate(JSON.parse(raw));
  } catch (error) {
    console.warn('Progress recovery: invalid saved state was replaced.', error);
    return createInitialState();
  }
}

export function saveState(state) {
  const safe = migrateAndValidate(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  return safe;
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return createInitialState();
}

export function exportState(state) {
  return JSON.stringify(migrateAndValidate(state), null, 2);
}

export function importState(text) {
  const parsed = JSON.parse(text);
  const validated = migrateAndValidate(parsed);
  saveState(validated);
  return validated;
}

export function migrateAndValidate(input) {
  const fresh = createInitialState();
  if (!input || typeof input !== 'object') return fresh;
  if (Number(input.schemaVersion) > SCHEMA_VERSION) throw new Error('This progress file uses a newer unsupported schema.');
  const sourceGame = input.learner?.games?.partialDerivativeFreeze;
  if (!sourceGame || typeof sourceGame !== 'object') return fresh;
  const targetGame = fresh.learner.games.partialDerivativeFreeze;
  targetGame.progress = sanitizeProgress(sourceGame.progress, targetGame.progress);
  targetGame.mastery = sanitizeMastery(sourceGame.mastery, targetGame.mastery);
  targetGame.misconceptions = sanitizeCounts(sourceGame.misconceptions);
  targetGame.currentRound = sanitizeRoundReference(sourceGame.currentRound);
  targetGame.currentAnswer = sanitizeDraft(sourceGame.currentAnswer);
  targetGame.notebookDiscoveries = Array.isArray(sourceGame.notebookDiscoveries) ? sourceGame.notebookDiscoveries.filter((item) => typeof item === 'string').slice(0, 100) : [];
  const settings = isPlainObject(input.learner?.settings) ? input.learner.settings : {};
  fresh.learner.settings = { reducedMotion: Boolean(settings.reducedMotion), largeText: Boolean(settings.largeText), sound: Boolean(settings.sound) };
  return fresh;
}


function sanitizeRoundReference(input) {
  if (!isPlainObject(input) || typeof input.id !== 'string') return null;
  return {
    id: input.id.slice(0, 200),
    seed: Number(input.seed) >>> 0,
    level: clampInt(input.level, 1, 12, 1),
    taskKind: ['standard', 'gradient', 'bug-hunter'].includes(input.taskKind) ? input.taskKind : 'standard',
    weakness: typeof input.weakness === 'string' && /^[a-z0-9-]+$/i.test(input.weakness) ? input.weakness.slice(0, 80) : null
  };
}

function sanitizeDraft(input) {
  if (!isPlainObject(input) || typeof input.roundId !== 'string') return null;
  const shape = ['scalar', 'row-vector', 'vector', 'matrix'].includes(input.shape) ? input.shape : null;
  const dependencies = isPlainObject(input.termDependencies)
    ? Object.fromEntries(Object.entries(input.termDependencies).filter(([key]) => /^\d+$/.test(key)).slice(0, 10).map(([key, value]) => [key, Boolean(value)]))
    : {};
  return {
    roundId: input.roundId.slice(0, 200),
    shape,
    activeVariable: safeSymbol(input.activeVariable),
    frozenVariables: Array.isArray(input.frozenVariables) ? input.frozenVariables.map(safeSymbol).filter(Boolean).slice(0, 10) : [],
    termDependencies: dependencies,
    selectedRules: Array.isArray(input.selectedRules) ? input.selectedRules.filter((item) => typeof item === 'string' && /^[a-z0-9-]+$/i.test(item)).slice(0, 15) : [],
    finalExpression: typeof input.finalExpression === 'string' ? input.finalExpression.slice(0, 500) : '',
    gradientComponents: Array.isArray(input.gradientComponents) ? input.gradientComponents.filter((item) => typeof item === 'string').map((item) => item.slice(0, 500)).slice(0, 10) : [],
    firstIncorrectIndex: Number.isInteger(input.firstIncorrectIndex) ? Math.max(0, Math.min(20, input.firstIncorrectIndex)) : null,
    explanationChoice: input.explanationChoice === 'correct' ? 'correct' : null,
    hintsUsed: clampInt(input.hintsUsed, 0, 20, 0),
    attemptNumber: clampInt(input.attemptNumber, 1, 100, 1),
    correct: Boolean(input.correct),
    savedAt: typeof input.savedAt === 'string' ? input.savedAt.slice(0, 40) : null,
    submittedAt: typeof input.submittedAt === 'string' ? input.submittedAt.slice(0, 40) : null
  };
}

function safeSymbol(value) {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(value) ? value.slice(0, 30) : null;
}

function sanitizeProgress(input, fallback) {
  if (!isPlainObject(input)) return fallback;
  return {
    currentLevel: clampInt(input.currentLevel, 1, 12, 1),
    completedLevels: Array.isArray(input.completedLevels) ? [...new Set(input.completedLevels.map(Number).filter((n) => n >= 1 && n <= 12))] : [],
    attempts: nonNegativeInt(input.attempts), correct: nonNegativeInt(input.correct), totalScore: nonNegativeInt(input.totalScore), streak: nonNegativeInt(input.streak),
    tutorialComplete: Boolean(input.tutorialComplete), seenRounds: Array.isArray(input.seenRounds) ? input.seenRounds.filter((id) => typeof id === 'string').slice(-500) : [],
    lastPlayedAt: typeof input.lastPlayedAt === 'string' ? input.lastPlayedAt : null
  };
}

function sanitizeMastery(input, fallback) {
  if (!isPlainObject(input)) return fallback;
  const result = structuredClone(fallback);
  Object.keys(result).forEach((key) => {
    const source = input[key];
    if (!isPlainObject(source)) return;
    result[key] = {
      ...result[key], attempts: nonNegativeInt(source.attempts), correct: nonNegativeInt(source.correct), firstAttemptCorrect: nonNegativeInt(source.firstAttemptCorrect), hintsUsed: nonNegativeInt(source.hintsUsed),
      recentResults: Array.isArray(source.recentResults) ? source.recentResults.map(Boolean).slice(-5) : [], misconceptionCounts: sanitizeCounts(source.misconceptionCounts),
      lastPractisedAt: typeof source.lastPractisedAt === 'string' ? source.lastPractisedAt : null, contextsSeen: Array.isArray(source.contextsSeen) ? source.contextsSeen.filter((x) => typeof x === 'string').slice(0, 30) : [],
      masteryState: ['not-introduced', 'introduced', 'practising', 'proficient', 'mastered', 'needs-review'].includes(source.masteryState) ? source.masteryState : 'not-introduced'
    };
  });
  return result;
}

function sanitizeCounts(input) {
  if (!isPlainObject(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([key]) => /^[a-z0-9-]+$/i.test(key)).map(([key, value]) => [key, nonNegativeInt(value)]));
}

function isPlainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function nonNegativeInt(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function clampInt(value, min, max, fallback) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
