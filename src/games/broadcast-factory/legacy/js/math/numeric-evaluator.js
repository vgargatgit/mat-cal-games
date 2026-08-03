import { validateBroadcastCompatibility } from './operation-model.js';

const values = (operand) => operand.values;
const scalar = (operand) => operand.value;

export function evaluateOperation(operationType, operands) {
  const validation = validateBroadcastCompatibility(operationType, operands);
  if (!validation.valid) throw new Error(validation.reason);
  switch (operationType) {
    case 'vector-plus-scalar': return values(operands[0]).map((x) => x + scalar(operands[1]));
    case 'scalar-plus-vector': return values(operands[1]).map((x) => scalar(operands[0]) + x);
    case 'vector-minus-scalar': return values(operands[0]).map((x) => x - scalar(operands[1]));
    case 'scalar-minus-vector': return values(operands[1]).map((x) => scalar(operands[0]) - x);
    case 'scalar-times-vector': return values(operands[1]).map((x) => scalar(operands[0]) * x);
    case 'vector-times-scalar': return values(operands[0]).map((x) => x * scalar(operands[1]));
    case 'vector-plus-vector': return values(operands[0]).map((x, i) => x + values(operands[1])[i]);
    case 'vector-minus-vector': return values(operands[0]).map((x, i) => x - values(operands[1])[i]);
    case 'elementwise-multiply': return values(operands[0]).map((x, i) => x * values(operands[1])[i]);
    case 'elementwise-divide': return values(operands[0]).map((x, i) => x / values(operands[1])[i]);
    case 'dot-product': return values(operands[0]).reduce((sum, x, i) => sum + x * values(operands[1])[i], 0);
    case 'sum-reduction': return values(operands[0]).reduce((sum, x) => sum + x, 0);
    case 'matrix-vector': return operands[0].values.map((row) => row.reduce((sum, a, j) => sum + a * values(operands[1])[j], 0));
    case 'shared-scale-shift': return values(operands[0]).map((x) => scalar(operands[1]) * x + scalar(operands[2]));
    case 'per-feature-scale-shift': return values(operands[0]).map((x, i) => values(operands[1])[i] * x + values(operands[2])[i]);
    default: throw new Error(`Evaluation not implemented for ${operationType}`);
  }
}
