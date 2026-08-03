import { collectVariables, containsVariable, evaluate, simplify, stableKey, c } from './ast.js';
import { derivative } from './derivative.js';

export function jacobianShape(outputCount, inputCount) {
  if (!Number.isInteger(outputCount) || outputCount < 1 || !Number.isInteger(inputCount) || inputCount < 1) {
    throw new RangeError('Jacobian dimensions must be positive integers.');
  }
  return {
    rows: outputCount,
    columns: inputCount,
    semanticType: outputCount === 1 && inputCount === 1 ? 'scalar' : outputCount === 1 ? 'row-vector' : inputCount === 1 ? 'column-vector' : 'matrix',
  };
}

export function dependencyMatrix(outputExpressions, inputVariables) {
  return outputExpressions.map(expression => inputVariables.map(variable => containsVariable(expression, variable)));
}

export function jacobianEntry(outputExpression, inputVariable, context = {}) {
  return derivative(outputExpression, inputVariable, context);
}

export function computeJacobian(outputExpressions, inputVariables, context = {}) {
  return outputExpressions.map(output => inputVariables.map(input => jacobianEntry(output, input, context)));
}

export function isZeroExpression(expression) {
  const value = simplify(expression);
  return value.type === 'const' && value.value === 0;
}

export function isOneExpression(expression) {
  const value = simplify(expression);
  return value.type === 'const' && value.value === 1;
}

export function classifyJacobian(jacobian, dependencies = null) {
  const rows = jacobian.length;
  const columns = jacobian[0]?.length || 0;
  const square = rows === columns;
  const zeros = jacobian.flat().filter(isZeroExpression).length;
  const total = rows * columns;
  const zeroRows = jacobian.map((row, index) => row.every(isZeroExpression) ? index : -1).filter(index => index >= 0);
  const zeroColumns = Array.from({ length: columns }, (_, column) =>
    jacobian.every(row => isZeroExpression(row[column])) ? column : -1
  ).filter(index => index >= 0);
  const diagonal = square && jacobian.every((row, i) => row.every((cell, j) => i === j || isZeroExpression(cell)));
  const identity = diagonal && jacobian.every((row, i) => isOneExpression(row[i]));
  const variableCount = jacobian.flat().reduce((count, cell) => count + collectVariables(cell).size, 0);
  const constant = variableCount === 0 && !jacobian.flat().some(cell => containsNodeType(cell, 'reluDerivative'));
  const structurallyConnected = dependencies ? dependencies.flat().filter(Boolean).length : total - zeros;
  return {
    square,
    rectangular: !square,
    identity,
    diagonal,
    sparse: zeros > 0 && zeros / total >= 0.25,
    dense: zeros === 0,
    constant,
    inputDependent: !constant,
    zeroRows,
    zeroColumns,
    zeroCount: zeros,
    totalCells: total,
    structuralConnections: structurallyConnected,
  };
}

function containsNodeType(node, type) {
  if (node.type === type) return true;
  if (node.type === 'add') return node.terms.some(term => containsNodeType(term, type));
  if (node.type === 'mul') return node.factors.some(factor => containsNodeType(factor, type));
  if (node.type === 'pow') return containsNodeType(node.base, type);
  if (node.arg) return containsNodeType(node.arg, type);
  return false;
}

export function evaluateJacobian(jacobian, point, context = {}) {
  return jacobian.map(row => row.map(cell => evaluate(cell, point, context)));
}

export function numericalJacobian(outputExpressions, inputVariables, point, epsilon = 1e-5) {
  return outputExpressions.map(output => inputVariables.map(variable => {
    const plus = { ...point, [variable]: Number(point[variable]) + epsilon };
    const minus = { ...point, [variable]: Number(point[variable]) - epsilon };
    return (evaluate(output, plus) - evaluate(output, minus)) / (2 * epsilon);
  }));
}

export function verifyJacobianNumerically(outputExpressions, inputVariables, symbolicJacobian, points, tolerance = 1e-5) {
  const failures = [];
  for (const point of points) {
    const numeric = numericalJacobian(outputExpressions, inputVariables, point);
    const symbolic = evaluateJacobian(symbolicJacobian, point);
    numeric.forEach((row, i) => row.forEach((value, j) => {
      const scale = Math.max(1, Math.abs(value), Math.abs(symbolic[i][j]));
      if (Math.abs(value - symbolic[i][j]) > tolerance * scale) {
        failures.push({ point, row: i, column: j, numeric: value, symbolic: symbolic[i][j] });
      }
    }));
  }
  return { ok: failures.length === 0, failures };
}

export function matrixStableKey(matrix) {
  return matrix.map(row => row.map(cell => stableKey(cell)).join(',')).join(';');
}

export function zeroMatrix(rows, columns) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => c(0)));
}
