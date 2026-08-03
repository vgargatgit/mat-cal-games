import { SeededRandom } from './seeded-random.js';
import { getLevel } from '../data/levels.js';
import { formatPlainMath } from '../math-renderer.js';
import { OPERATION_DEFINITIONS, computeOutputShape, expandToComponents } from '../math/operation-model.js';
import { evaluateOperation } from '../math/numeric-evaluator.js';
import { computeDependencyMatrix, dependencyPattern } from '../math/dependency-analysis.js';
import { computeLocalDerivative } from '../math/symbolic-derivative.js';

const vectorNames = ['x', 'v', 'g', 'beta', 'gamma'];
const scalarNames = ['z', 'a', 'b', 'g'];
const operationLabels = Object.fromEntries(Object.entries(OPERATION_DEFINITIONS).map(([key, value]) => [key, value.label]));

function nonZeroInteger(rng, min = -5, max = 5) {
  let value = 0;
  while (value === 0) value = rng.integer(min, max);
  return value;
}

function vector(rng, name, length, { nonZero = false } = {}) {
  return {
    name,
    semanticType: 'column-vector',
    length,
    values: Array.from({ length }, () => nonZero ? nonZeroInteger(rng) : rng.integer(-5, 5))
  };
}

function scalar(rng, name, { allowZero = false } = {}) {
  return { name, semanticType: 'scalar', value: allowZero ? rng.integer(-5, 5) : nonZeroInteger(rng) };
}

function matrix(rng, name, rows, columns) {
  return { name, semanticType: 'matrix', rows, columns, values: Array.from({ length: rows }, () => Array.from({ length: columns }, () => rng.integer(-3, 3))) };
}

function makeOperands(operationType, rng, length) {
  switch (operationType) {
    case 'vector-plus-scalar': return [vector(rng, 'x', length), scalar(rng, 'z')];
    case 'scalar-plus-vector': return [scalar(rng, 'z'), vector(rng, 'x', length)];
    case 'vector-minus-scalar': return [vector(rng, 'x', length), scalar(rng, 'z')];
    case 'scalar-minus-vector': return [scalar(rng, 'z'), vector(rng, 'x', length)];
    case 'scalar-times-vector': return [scalar(rng, 'z'), vector(rng, 'x', length)];
    case 'vector-times-scalar': return [vector(rng, 'x', length), scalar(rng, 'z')];
    case 'vector-plus-vector': return [vector(rng, 'x', length), vector(rng, 'v', length)];
    case 'vector-minus-vector': return [vector(rng, 'x', length), vector(rng, 'v', length)];
    case 'elementwise-multiply': return [vector(rng, 'x', length), vector(rng, 'v', length)];
    case 'elementwise-divide': return [vector(rng, 'x', length), vector(rng, 'v', length, { nonZero: true })];
    case 'dot-product': return [vector(rng, 'x', length), vector(rng, 'v', length)];
    case 'sum-reduction': return [vector(rng, 'x', length)];
    case 'matrix-vector': return [matrix(rng, 'A', length, length), vector(rng, 'x', length)];
    case 'shared-scale-shift': return [vector(rng, 'x', length), scalar(rng, 'a'), scalar(rng, 'b', { allowZero: true })];
    case 'per-feature-scale-shift': return [vector(rng, 'x', length), vector(rng, 'gamma', length), vector(rng, 'beta', length)];
    default: throw new Error(`No operand generator for ${operationType}`);
  }
}

function targetChoices(operationType, operands) {
  if (operationType === 'matrix-vector') return operands.filter((item) => item.semanticType === 'column-vector');
  return operands.filter((item) => item.semanticType !== 'matrix');
}


function makeComparison(levelId, round, rng) {
  const length = round.outputShape.components === 1
    ? round.operands.find((item) => item.semanticType === 'column-vector')?.values.length ?? 3
    : round.outputShape.components;
  if (levelId === 11) {
    if (['scalar-times-vector','vector-times-scalar'].includes(round.operationType)) {
      const x = round.operands.find((item) => item.semanticType === 'column-vector');
      const operands = [structuredClone(x), vector(rng, 'v', x.values.length)];
      return { operationType: 'dot-product', operands, output: evaluateOperation('dot-product', operands) };
    }
    const x = round.operands.find((item) => item.semanticType === 'column-vector');
    const operands = [scalar(rng, 'z'), structuredClone(x)];
    return { operationType: 'scalar-times-vector', operands, output: evaluateOperation('scalar-times-vector', operands) };
  }
  if (levelId === 12) {
    if (round.operationType === 'matrix-vector') {
      const x = structuredClone(round.operands[1]);
      const operands = [x, scalar(rng, 'z')];
      return { operationType: 'vector-plus-scalar', operands, output: evaluateOperation('vector-plus-scalar', operands) };
    }
    const x = structuredClone(round.operands.find((item) => item.semanticType === 'column-vector'));
    const operands = [matrix(rng, 'A', x.values.length, x.values.length), x];
    return { operationType: 'matrix-vector', operands, output: evaluateOperation('matrix-vector', operands) };
  }
  if (levelId === 13) {
    const vectorInput = structuredClone(round.operands.find((item) => item.semanticType === 'column-vector'));
    if (round.operationType === 'vector-plus-scalar') {
      const operands = [vectorInput, vector(rng, 'b', vectorInput.values.length)];
      return { operationType: 'vector-plus-vector', operands, output: evaluateOperation('vector-plus-vector', operands), context: 'vector-bias' };
    }
    const operands = [vectorInput, scalar(rng, 'b')];
    return { operationType: 'vector-plus-scalar', operands, output: evaluateOperation('vector-plus-scalar', operands), context: 'shared-bias' };
  }
  if (levelId === 14) {
    const x = structuredClone(round.operands.find((item) => item.semanticType === 'column-vector'));
    if (['scalar-times-vector','vector-times-scalar'].includes(round.operationType)) {
      const operands = [x, vector(rng, 'g', x.values.length)];
      return { operationType: 'elementwise-multiply', operands, output: evaluateOperation('elementwise-multiply', operands), context: 'per-feature-gate' };
    }
    const operands = [scalar(rng, 'g'), x];
    return { operationType: 'scalar-times-vector', operands, output: evaluateOperation('scalar-times-vector', operands), context: 'shared-gate' };
  }
  return null;
}

function modeForAttempt(level, attempt) {
  const cycle = ['guided', 'practice', 'repair', 'challenge'];
  const offset = level.focus === 'repair' ? 2 : level.focus === 'challenge' ? 3 : 0;
  return cycle[(attempt + offset) % cycle.length];
}

function makeRepairScenario(round, rng) {
  const derivative = round.derivative.matrix;
  const rows = derivative.length;
  const columns = derivative[0].length;
  const options = [];
  if (round.outputShape.components > 1) options.push({ id: 'scalar-output-collapse', claim: 'The output is a scalar because one input is scalar.' });
  if (columns === 1 && rows > 1) options.push({ id: 'scalar-derivative-as-scalar', claim: 'The derivative is the scalar 1 because the denominator is scalar.' });
  if (round.operationType.includes('times') && round.targetName === round.operands.find((item) => item.semanticType === 'scalar')?.name) options.push({ id: 'ones-for-scaling', claim: 'The derivative with respect to the scalar is a column of ones.' });
  if (round.operationType.includes('times') && round.targetName === round.operands.find((item) => item.semanticType === 'column-vector')?.name) options.push({ id: 'missing-scalar-multiplier', claim: 'The derivative with respect to the vector is identity.' });
  if (round.operationType === 'dot-product') options.push({ id: 'dot-product-confusion', claim: 'This machine preserves a vector output.' });
  if (round.operationType === 'elementwise-multiply') options.push({ id: 'matrix-confusion', claim: 'Every output receives every input coordinate.' });
  if (rows !== columns && rows > 1) options.push({ id: 'wrong-orientation', claim: `The derivative shape is ${columns}×${rows}.` });
  if (!options.length) options.push({ id: 'diagonal-is-identity', claim: 'Every diagonal Jacobian is identity.' });
  return rng.pick(options);
}

export function generateRound({ levelId = 1, seed = Date.now(), attempt = 0, forcedOperation = null } = {}) {
  const level = getLevel(levelId) ?? getLevel(1);
  const rng = new SeededRandom(seed);
  const operationType = forcedOperation ?? rng.pick(level.families);
  const length = rng.integer(2, Math.min(5, 2 + Math.floor(levelId / 4) + 1));
  const operands = makeOperands(operationType, rng, length);
  const targets = targetChoices(operationType, operands);
  const target = rng.pick(targets);
  const outputShape = computeOutputShape(operationType, operands);
  const output = evaluateOperation(operationType, operands);
  const derivative = computeLocalDerivative(operationType, operands, target.name);
  const dependencyMatrix = computeDependencyMatrix(operationType, operands, target.name);
  const mode = modeForAttempt(level, attempt);
  const round = {
    id: `L${String(levelId).padStart(2, '0')}-${operationType}-${seed}`,
    seed,
    levelId,
    levelTitle: level.title,
    difficulty: levelId < 6 ? 'foundation' : levelId < 13 ? 'intermediate' : 'advanced',
    mode,
    operationType,
    operationLabel: operationLabels[operationType],
    operation: OPERATION_DEFINITIONS[operationType],
    operands,
    output,
    outputShape,
    componentForm: expandToComponents(operationType, operands),
    targetName: target.name,
    target,
    dependencyMatrix,
    dependencyPattern: dependencyPattern(dependencyMatrix),
    derivative,
    machineOptions: rng.shuffle(Object.keys(OPERATION_DEFINITIONS).filter((key) => !['scalar-plus-vector','vector-times-scalar','vector-minus-scalar','scalar-minus-vector','vector-minus-vector','elementwise-divide','sum-reduction'].includes(key))).slice(0, 6),
    hints: [
      'Identify each operand as a scalar, vector, or matrix.',
      `Write one component equation: ${formatPlainMath(OPERATION_DEFINITIONS[operationType].component)}.`,
      'Output components determine Jacobian rows; target-input components determine columns.',
      target.semanticType === 'scalar' ? 'The target has one degree of freedom, so the Jacobian has one column.' : 'Check whether output lane i depends on only input lane i or on several inputs.'
    ],
    neuralConnection: neuralConnection(operationType, target.name)
  };
  round.comparison = makeComparison(levelId, round, rng);
  if (mode === 'repair') round.repairScenario = makeRepairScenario(round, rng);
  return round;
}

export function neuralConnection(operationType, targetName) {
  if (['vector-plus-scalar','scalar-plus-vector'].includes(operationType)) return 'A shared scalar bias adds the same parameter to every activation. Its derivative is one full column.';
  if (operationType === 'vector-plus-vector') return 'A vector bias has one independent bias per feature, producing an identity Jacobian with respect to that bias vector.';
  if (['scalar-times-vector','vector-times-scalar'].includes(operationType)) return 'A learned shared gate or residual scale multiplies every feature by one parameter.';
  if (operationType === 'elementwise-multiply') return 'Per-feature gates multiply matching activations and parameters, producing diagonal Jacobians.';
  if (operationType === 'shared-scale-shift') return 'This is the local calculus pattern behind a shared normalization scale and shift.';
  if (operationType === 'per-feature-scale-shift') return 'Learned normalization parameters γ and β typically act per feature.';
  if (operationType === 'matrix-vector') return 'A dense layer mixes several input features into each output before any bias broadcast.';
  if (operationType === 'dot-product') return 'Attention scores and linear predictors often use dot products, which reduce vectors to scalars.';
  return `The target ${targetName} illustrates how local dependency structure controls backpropagation.`;
}

export function hydrateSampleRound(sample, levelId, attempt = 0) {
  const operands = structuredClone(sample.operands);
  const operationType = sample.operationType;
  const target = operands.find((item) => item.name === sample.targetName);
  const outputShape = computeOutputShape(operationType, operands);
  const output = evaluateOperation(operationType, operands);
  const derivative = computeLocalDerivative(operationType, operands, sample.targetName);
  const dependencyMatrix = computeDependencyMatrix(operationType, operands, sample.targetName);
  return {
    id: sample.id,
    seed: Number(sample.id.replace(/\D/g, '')) || 1,
    levelId,
    levelTitle: getLevel(levelId)?.title ?? sample.title,
    difficulty: levelId < 6 ? 'foundation' : levelId < 13 ? 'intermediate' : 'advanced',
    mode: attempt === 0 ? 'guided' : 'practice',
    sampleTitle: sample.title,
    operationType,
    operationLabel: operationLabels[operationType],
    operation: OPERATION_DEFINITIONS[operationType],
    operands,
    output,
    outputShape,
    componentForm: expandToComponents(operationType, operands),
    targetName: sample.targetName,
    target,
    dependencyMatrix,
    dependencyPattern: dependencyPattern(dependencyMatrix),
    derivative,
    machineOptions: Object.keys(OPERATION_DEFINITIONS).filter((key) => !['scalar-plus-vector','vector-times-scalar','vector-minus-scalar','scalar-minus-vector','vector-minus-vector','elementwise-divide','sum-reduction'].includes(key)).slice(0, 6),
    hints: [
      'Identify each operand as a scalar, vector, or matrix.',
      `Write one component equation: ${formatPlainMath(OPERATION_DEFINITIONS[operationType].component)}.`,
      'Output components determine Jacobian rows; target-input components determine columns.',
      target.semanticType === 'scalar' ? 'The target has one degree of freedom, so the Jacobian has one column.' : 'Check whether output lane i depends on only input lane i or on several inputs.'
    ],
    neuralConnection: neuralConnection(operationType, sample.targetName),
    comparison: sample.comparison ? structuredClone(sample.comparison) : null,
    context: sample.context ?? null,
    displayLatex: sample.displayLatex ?? null,
    sampleTitle: sample.title
  };
}

export function generatorInvariant(round) {
  const derivativeRows = round.derivative.matrix.length;
  const derivativeColumns = round.derivative.matrix[0].length;
  return round.outputShape.components === (Array.isArray(round.output) ? round.output.length : 1)
    && derivativeRows === round.derivative.shape.rows
    && derivativeColumns === round.derivative.shape.columns
    && round.dependencyMatrix.length === derivativeRows
    && round.dependencyMatrix[0].length === derivativeColumns;
}
