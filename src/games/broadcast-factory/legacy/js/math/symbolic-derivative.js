import { identityMatrix, diagonalMatrix, columnMatrix, rowMatrix, classifyDerivativeStructure } from './jacobian-builder.js';
import { derivativeShape, operandShape } from './shape-model.js';
import { computeOutputShape } from './operation-model.js';

function vectorOperand(operands) { return operands.find((item) => item.semanticType === 'column-vector'); }
function otherVector(operands, target) { return operands.find((item) => item.semanticType === 'column-vector' && item.name !== target); }
function scalarOperand(operands) { return operands.find((item) => item.semanticType === 'scalar'); }

export function computeLocalDerivative(operationType, operands, targetName) {
  const target = operands.find((item) => item.name === targetName);
  if (!target) throw new Error(`Unknown target ${targetName}`);
  const n = computeOutputShape(operationType, operands).components;
  let matrix;
  switch (operationType) {
    case 'vector-plus-scalar':
    case 'scalar-plus-vector':
      matrix = target.semanticType === 'scalar' ? columnMatrix(Array(n).fill(1)) : identityMatrix(n);
      break;
    case 'vector-minus-scalar':
      matrix = target.semanticType === 'scalar' ? columnMatrix(Array(n).fill(-1)) : identityMatrix(n);
      break;
    case 'scalar-minus-vector':
      matrix = target.semanticType === 'scalar' ? columnMatrix(Array(n).fill(1)) : identityMatrix(n, -1);
      break;
    case 'scalar-times-vector':
    case 'vector-times-scalar': {
      const vector = vectorOperand(operands);
      const scale = scalarOperand(operands).value;
      matrix = target.semanticType === 'scalar' ? columnMatrix(vector.values) : identityMatrix(n, scale);
      break;
    }
    case 'vector-plus-vector': matrix = identityMatrix(n); break;
    case 'vector-minus-vector': matrix = identityMatrix(n, target === operands[0] ? 1 : -1); break;
    case 'elementwise-multiply': matrix = diagonalMatrix(otherVector(operands, targetName).values); break;
    case 'elementwise-divide': {
      const numerator = operands[0];
      const denominator = operands[1];
      matrix = targetName === numerator.name
        ? diagonalMatrix(denominator.values.map((v) => 1 / v))
        : diagonalMatrix(numerator.values.map((x, i) => -x / (denominator.values[i] ** 2)));
      break;
    }
    case 'dot-product': matrix = rowMatrix(otherVector(operands, targetName).values); break;
    case 'sum-reduction': matrix = rowMatrix(Array(target.values.length).fill(1)); break;
    case 'matrix-vector':
      if (target.semanticType === 'column-vector') matrix = operands[0].values.map((row) => row.slice());
      else throw new Error('Matrix-input Jacobian is outside this game’s local scope.');
      break;
    case 'shared-scale-shift': {
      const [x, a] = operands;
      if (targetName === x.name) matrix = identityMatrix(n, a.value);
      else if (targetName === a.name) matrix = columnMatrix(x.values);
      else matrix = columnMatrix(Array(n).fill(1));
      break;
    }
    case 'per-feature-scale-shift': {
      const [x, gamma, beta] = operands;
      if (targetName === x.name) matrix = diagonalMatrix(gamma.values);
      else if (targetName === gamma.name) matrix = diagonalMatrix(x.values);
      else if (targetName === beta.name) matrix = identityMatrix(n);
      break;
    }
    default: throw new Error(`Derivative not implemented for ${operationType}`);
  }
  return {
    targetName,
    shape: derivativeShape(computeOutputShape(operationType, operands), operandShape(target)),
    matrix,
    classification: classifyDerivativeStructure(matrix)
  };
}
