import { evaluateOperation } from './numeric-evaluator.js';

const clone = (value) => structuredClone(value);
const asArray = (value) => Array.isArray(value) ? value : [value];

export function numericalJacobian(operationType, operands, targetName, epsilon = 1e-5) {
  const targetIndex = operands.findIndex((item) => item.name === targetName);
  if (targetIndex < 0) throw new Error(`Unknown target ${targetName}`);
  const target = operands[targetIndex];
  const inputCount = target.semanticType === 'scalar' ? 1 : target.values.length;
  const baseOutput = asArray(evaluateOperation(operationType, operands));
  const result = Array.from({ length: baseOutput.length }, () => Array(inputCount).fill(0));
  for (let column = 0; column < inputCount; column += 1) {
    const plus = clone(operands);
    const minus = clone(operands);
    if (target.semanticType === 'scalar') {
      plus[targetIndex].value += epsilon;
      minus[targetIndex].value -= epsilon;
    } else {
      plus[targetIndex].values[column] += epsilon;
      minus[targetIndex].values[column] -= epsilon;
    }
    const yPlus = asArray(evaluateOperation(operationType, plus));
    const yMinus = asArray(evaluateOperation(operationType, minus));
    for (let row = 0; row < baseOutput.length; row += 1) result[row][column] = (yPlus[row] - yMinus[row]) / (2 * epsilon);
  }
  return result;
}

export function matricesClose(actual, expected, tolerance = 1e-6) {
  return actual.length === expected.length && actual.every((row, i) => row.length === expected[i].length && row.every((value, j) => Math.abs(Number(value) - Number(expected[i][j])) <= tolerance));
}
