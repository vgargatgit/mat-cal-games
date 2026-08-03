import { computeOutputShape } from './operation-model.js';
import { operandShape } from './shape-model.js';

const full = (rows, columns, value = true) => Array.from({ length: rows }, () => Array(columns).fill(value));
const identity = (size) => Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => row === column));

export function computeDependencyMatrix(operationType, operands, targetName) {
  const targetIndex = operands.findIndex((item) => item.name === targetName);
  if (targetIndex < 0) throw new Error(`Unknown derivative target: ${targetName}`);
  const rows = computeOutputShape(operationType, operands).components;
  const columns = operandShape(operands[targetIndex]).components;
  if (operationType === 'dot-product' || operationType === 'sum-reduction') return full(rows, columns);
  if (operationType === 'matrix-vector') {
    if (targetIndex === 1) return operands[0].values.map((row) => row.map((entry) => entry !== 0));
    return full(rows, columns);
  }
  if (['vector-plus-scalar', 'scalar-plus-vector', 'vector-minus-scalar', 'scalar-minus-vector', 'scalar-times-vector', 'vector-times-scalar'].includes(operationType)) {
    return columns === 1 ? full(rows, 1) : identity(rows);
  }
  if (['vector-plus-vector', 'vector-minus-vector', 'elementwise-multiply', 'elementwise-divide', 'per-feature-scale-shift'].includes(operationType)) return identity(rows);
  if (operationType === 'shared-scale-shift') return columns === 1 ? full(rows, 1) : identity(rows);
  return full(rows, columns);
}

export function dependencyPattern(matrix) {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const active = matrix.flat().filter(Boolean).length;
  if (columns === 1 && active === rows) return 'full-column';
  if (rows === columns && matrix.every((row, i) => row.every((cell, j) => cell === (i === j)))) return 'diagonal';
  if (active === rows * columns) return 'dense';
  if (rows === 1 && active === columns) return 'reduced';
  return 'sparse';
}
