import { operandShape, scalarShape, columnVectorShape, matrixShape } from './shape-model.js';

export const OPERATION_DEFINITIONS = Object.freeze({
  'vector-plus-scalar': { label: 'Broadcast Add', family: 'broadcast', symbol: '+', operandTypes: ['column-vector', 'scalar'], component: 'y_i=x_i+z' },
  'scalar-plus-vector': { label: 'Broadcast Add', family: 'broadcast', symbol: '+', operandTypes: ['scalar', 'column-vector'], component: 'y_i=z+x_i' },
  'vector-minus-scalar': { label: 'Broadcast Subtract', family: 'broadcast', symbol: '−', operandTypes: ['column-vector', 'scalar'], component: 'y_i=x_i-z' },
  'scalar-minus-vector': { label: 'Reverse Broadcast Subtract', family: 'broadcast', symbol: '−', operandTypes: ['scalar', 'column-vector'], component: 'y_i=z-x_i' },
  'scalar-times-vector': { label: 'Scalar Scale', family: 'broadcast', symbol: '×', operandTypes: ['scalar', 'column-vector'], component: 'y_i=zx_i' },
  'vector-times-scalar': { label: 'Scalar Scale', family: 'broadcast', symbol: '×', operandTypes: ['column-vector', 'scalar'], component: 'y_i=x_iz' },
  'vector-plus-vector': { label: 'Element-wise Add', family: 'elementwise', symbol: '+', operandTypes: ['column-vector', 'column-vector'], component: 'y_i=x_i+v_i' },
  'vector-minus-vector': { label: 'Element-wise Subtract', family: 'elementwise', symbol: '−', operandTypes: ['column-vector', 'column-vector'], component: 'y_i=x_i-v_i' },
  'elementwise-multiply': { label: 'Element-wise Multiply', family: 'elementwise', symbol: '⊙', operandTypes: ['column-vector', 'column-vector'], component: 'y_i=x_iv_i' },
  'elementwise-divide': { label: 'Element-wise Divide', family: 'elementwise', symbol: '⊘', operandTypes: ['column-vector', 'column-vector'], component: 'y_i=x_i/v_i' },
  'dot-product': { label: 'Dot Product', family: 'reduction', symbol: '·', operandTypes: ['column-vector', 'column-vector'], component: 's=Σ_i x_iv_i' },
  'sum-reduction': { label: 'Sum Funnel', family: 'reduction', symbol: 'Σ', operandTypes: ['column-vector'], component: 's=Σ_i x_i' },
  'matrix-vector': { label: 'Matrix Mixer', family: 'matrix', symbol: '×', operandTypes: ['matrix', 'column-vector'], component: 'y_i=Σ_j A_{ij}x_j' },
  'shared-scale-shift': { label: 'Shared Shift & Scale', family: 'composite', symbol: 'ax+b', operandTypes: ['column-vector', 'scalar', 'scalar'], component: 'y_i=ax_i+b' },
  'per-feature-scale-shift': { label: 'Per-feature Shift & Scale', family: 'composite', symbol: 'γ⊙x+β', operandTypes: ['column-vector', 'column-vector', 'column-vector'], component: 'y_i=γ_ix_i+β_i' }
});

function isVector(type) { return type === 'column-vector' || type === 'row-vector'; }

export function inferOperation(leftOperand, operator, rightOperand) {
  const left = leftOperand.semanticType;
  const right = rightOperand?.semanticType;
  if (operator === '+' && isVector(left) && right === 'scalar') return 'vector-plus-scalar';
  if (operator === '+' && left === 'scalar' && isVector(right)) return 'scalar-plus-vector';
  if (operator === '-' && isVector(left) && right === 'scalar') return 'vector-minus-scalar';
  if (operator === '-' && left === 'scalar' && isVector(right)) return 'scalar-minus-vector';
  if ((operator === '*' || operator === '×') && left === 'scalar' && isVector(right)) return 'scalar-times-vector';
  if ((operator === '*' || operator === '×') && isVector(left) && right === 'scalar') return 'vector-times-scalar';
  if (operator === '+' && isVector(left) && isVector(right)) return 'vector-plus-vector';
  if (operator === '-' && isVector(left) && isVector(right)) return 'vector-minus-vector';
  if ((operator === '⊙' || operator === '.*') && isVector(left) && isVector(right)) return 'elementwise-multiply';
  if ((operator === '⊘' || operator === './') && isVector(left) && isVector(right)) return 'elementwise-divide';
  if ((operator === 'dot' || operator === '·') && isVector(left) && isVector(right)) return 'dot-product';
  if ((operator === '*' || operator === '×') && left === 'matrix' && isVector(right)) return 'matrix-vector';
  throw new Error(`Unsupported or ambiguous operation: ${left} ${operator} ${right ?? ''}`);
}

export function validateBroadcastCompatibility(operationType, operands) {
  const definition = OPERATION_DEFINITIONS[operationType];
  if (!definition) return { valid: false, reason: 'Unknown operation.' };
  if (operands.length !== definition.operandTypes.length) return { valid: false, reason: 'Incorrect operand count.' };
  for (let index = 0; index < operands.length; index += 1) {
    if (operands[index].semanticType !== definition.operandTypes[index]) {
      return { valid: false, reason: `Operand ${index + 1} must be ${definition.operandTypes[index]}.` };
    }
  }
  const vectorLengths = operands.filter((item) => isVector(item.semanticType)).map((item) => operandShape(item).components);
  if (definition.family === 'elementwise' || operationType === 'dot-product' || operationType === 'per-feature-scale-shift') {
    if (!vectorLengths.every((length) => length === vectorLengths[0])) return { valid: false, reason: 'Vector lengths must match.' };
  }
  if (operationType === 'matrix-vector') {
    const matrix = operands[0];
    const vector = operands[1];
    if ((matrix.columns ?? matrix.values[0].length) !== (vector.length ?? vector.values.length)) return { valid: false, reason: 'Matrix columns must equal vector length.' };
  }
  if (operationType === 'elementwise-divide' && operands[1].values.some((value) => value === 0)) return { valid: false, reason: 'Division denominator cannot contain zero.' };
  return { valid: true };
}

export function computeOutputShape(operationType, operands) {
  const result = validateBroadcastCompatibility(operationType, operands);
  if (!result.valid) throw new Error(result.reason);
  switch (operationType) {
    case 'dot-product':
    case 'sum-reduction': return scalarShape();
    case 'matrix-vector': return columnVectorShape(operands[0].rows ?? operands[0].values.length);
    case 'shared-scale-shift':
    case 'per-feature-scale-shift':
    default: {
      const vector = operands.find((item) => isVector(item.semanticType));
      if (vector) return columnVectorShape(vector.length ?? vector.values.length);
      const matrix = operands.find((item) => item.semanticType === 'matrix');
      return matrix ? matrixShape(matrix.rows, matrix.columns) : scalarShape();
    }
  }
}

export function expandToComponents(operationType, operands) {
  const output = computeOutputShape(operationType, operands);
  if (output.components === 1) return [OPERATION_DEFINITIONS[operationType].component];
  const expression = OPERATION_DEFINITIONS[operationType].component;
  return Array.from({ length: output.components }, (_, index) => expression.replaceAll('_i', `_${index + 1}`).replaceAll('{ij}', `{${index + 1}j}`));
}
