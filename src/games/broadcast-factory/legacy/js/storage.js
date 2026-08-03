export const STORAGE_KEY = 'arcade.legacy.broadcast-factory.v1';
export const SCHEMA_VERSION = 1;

export function defaultGameState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    learner: {
      games: {
        broadcastFactory: {
          progress: { currentLevel: 1, completedLevels: [], score: 0, attemptsByLevel: {}, tutorialComplete: false, stationStats: {} },
          mastery: {},
          misconceptions: {},
          currentRound: null,
          partialAnswer: null,
          conceptsDiscovered: []
        }
      },
      settings: { reducedMotion: false, fontScale: 1 }
    }
  };
}

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

const ALLOWED_OPERATIONS = new Set(['vector-plus-scalar','scalar-plus-vector','vector-minus-scalar','scalar-minus-vector','scalar-times-vector','vector-times-scalar','vector-plus-vector','vector-minus-vector','elementwise-multiply','elementwise-divide','dot-product','sum-reduction','matrix-vector','shared-scale-shift','per-feature-scale-shift']);
const ALLOWED_TYPES = new Set(['scalar','column-vector','row-vector','matrix']);
const ALLOWED_FAMILIES = new Set(['broadcast','elementwise','reduction','matrix','composite']);
const ALLOWED_MODES = new Set(['guided','practice','repair','challenge']);
const ALLOWED_MISCONCEPTIONS = new Set(['scalar-output-collapse','scalar-independent-copies','scalar-derivative-as-scalar','identity-for-scalar-derivative','ones-for-scaling','missing-scalar-multiplier','dot-product-confusion','matrix-confusion','shared-vector-bias-confusion','diagonal-is-identity','wrong-orientation','wrong-subtraction-sign','dense-broadcast-dependency']);

function finiteNumber(value) { return typeof value === 'number' && Number.isFinite(value); }
function validName(value) { return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,20}$/.test(value); }
function validOperand(operand) {
  if (!isPlainObject(operand) || !validName(operand.name) || !ALLOWED_TYPES.has(operand.semanticType)) return false;
  if (operand.semanticType === 'scalar') return finiteNumber(operand.value);
  if (operand.semanticType === 'matrix') {
    return Array.isArray(operand.values) && operand.values.length >= 1 && operand.values.length <= 5
      && operand.values.every((row) => Array.isArray(row) && row.length >= 1 && row.length <= 5 && row.every(finiteNumber));
  }
  return Array.isArray(operand.values) && operand.values.length >= 1 && operand.values.length <= 5 && operand.values.every(finiteNumber);
}
function validNumericOutput(output) {
  return finiteNumber(output) || (Array.isArray(output) && output.length >= 1 && output.length <= 5 && output.every(finiteNumber));
}
function validBooleanMatrix(matrix, rows, columns) {
  return Array.isArray(matrix) && matrix.length === rows && matrix.every((row) => Array.isArray(row) && row.length === columns && row.every((value) => typeof value === 'boolean'));
}
function validComparison(comparison) {
  if (comparison === null || comparison === undefined) return true;
  return isPlainObject(comparison) && ALLOWED_OPERATIONS.has(comparison.operationType)
    && Array.isArray(comparison.operands) && comparison.operands.length >= 1 && comparison.operands.length <= 3
    && comparison.operands.every(validOperand) && (comparison.output === undefined || validNumericOutput(comparison.output));
}
function validRoundSnapshot(round) {
  if (round === null) return true;
  if (!isPlainObject(round) || !ALLOWED_OPERATIONS.has(round.operationType)) return false;
  if (!Number.isInteger(round.levelId) || round.levelId < 1 || round.levelId > 18 || !finiteNumber(round.seed)) return false;
  if (!ALLOWED_MODES.has(round.mode) || typeof round.id !== 'string' || round.id.length > 160) return false;
  if (!Array.isArray(round.operands) || round.operands.length < 1 || round.operands.length > 3 || !round.operands.every(validOperand)) return false;
  if (!validName(round.targetName) || !round.operands.some((operand) => operand.name === round.targetName)) return false;
  if (!isPlainObject(round.operation) || !ALLOWED_FAMILIES.has(round.operation.family) || typeof round.operation.component !== 'string' || round.operation.component.length > 120) return false;
  if (typeof round.operationLabel !== 'string' || round.operationLabel.length > 100 || !validNumericOutput(round.output)) return false;
  const outputShape = round.outputShape;
  if (!isPlainObject(outputShape) || !Number.isInteger(outputShape.components) || outputShape.components < 1 || outputShape.components > 5) return false;
  const shape = round.derivative?.shape;
  if (!isPlainObject(shape) || !Number.isInteger(shape.rows) || !Number.isInteger(shape.columns) || shape.rows < 1 || shape.rows > 5 || shape.columns < 1 || shape.columns > 5) return false;
  if (!Array.isArray(round.derivative?.matrix) || round.derivative.matrix.length !== shape.rows || !round.derivative.matrix.every((row) => Array.isArray(row) && row.length === shape.columns && row.every(finiteNumber))) return false;
  if (!validBooleanMatrix(round.dependencyMatrix, shape.rows, shape.columns)) return false;
  if (!Array.isArray(round.machineOptions) || round.machineOptions.some((item) => !ALLOWED_OPERATIONS.has(item))) return false;
  if (!Array.isArray(round.hints) || round.hints.length > 8 || round.hints.some((item) => typeof item !== 'string' || item.length > 500)) return false;
  if (!Array.isArray(round.componentForm) || round.componentForm.length > 5 || round.componentForm.some((item) => typeof item !== 'string' || item.length > 250)) return false;
  if (round.mode === 'repair' && (!isPlainObject(round.repairScenario) || !ALLOWED_MISCONCEPTIONS.has(round.repairScenario.id) || typeof round.repairScenario.claim !== 'string' || round.repairScenario.claim.length > 500)) return false;
  return validComparison(round.comparison);
}

export function validateImportedState(candidate) {
  if (!isPlainObject(candidate) || candidate.schemaVersion !== SCHEMA_VERSION) return { valid: false, reason: 'Unsupported or missing schema version.' };
  const game = candidate.learner?.games?.broadcastFactory;
  if (!isPlainObject(game) || !isPlainObject(game.progress) || !isPlainObject(game.mastery)) return { valid: false, reason: 'Missing Broadcast Factory progress data.' };
  if (Object.keys(game.mastery).length > 100 || Object.keys(game.misconceptions ?? {}).length > 100) return { valid: false, reason: 'Progress data is unexpectedly large.' };
  if (!Number.isInteger(game.progress.currentLevel) || game.progress.currentLevel < 1 || game.progress.currentLevel > 18) return { valid: false, reason: 'Invalid current level.' };
  if (!Array.isArray(game.progress.completedLevels) || game.progress.completedLevels.some((item) => !Number.isInteger(item) || item < 1 || item > 18)) return { valid: false, reason: 'Invalid completed level list.' };
  if (!validRoundSnapshot(game.currentRound)) return { valid: false, reason: 'Invalid current-round snapshot.' };
  return { valid: true };
}

export function loadState(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultGameState();
    const parsed = JSON.parse(raw);
    return validateImportedState(parsed).valid ? parsed : defaultGameState();
  } catch {
    return defaultGameState();
  }
}

export function saveState(state, storage = localStorage) {
  const validation = validateImportedState(state);
  if (!validation.valid) throw new Error(validation.reason);
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(storage = localStorage) {
  storage.removeItem(STORAGE_KEY);
  return defaultGameState();
}

export function exportState(state) { return JSON.stringify(state, null, 2); }

export function importState(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('The selected progress file is too large.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
  const validation = validateImportedState(parsed);
  if (!validation.valid) throw new Error(validation.reason);
  return parsed;
}
