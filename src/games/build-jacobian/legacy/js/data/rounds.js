import { c, v, add, mul, pow, sin, exp, relu } from '../math/ast.js';
import { jacobianShape, dependencyMatrix, computeJacobian, classifyJacobian, evaluateJacobian } from '../math/jacobian.js';

const X1 = v('x_1');
const X2 = v('x_2');
const X3 = v('x_3');
const X4 = v('x_4');
const Z1 = v('z_1');
const Z2 = v('z_2');

export function createRound(spec) {
  const outputExpressions = spec.outputs.map(output => output.expression);
  const dependencies = dependencyMatrix(outputExpressions, spec.inputs);
  const symbolicJacobian = computeJacobian(outputExpressions, spec.inputs, spec.context || {});
  const expectedJacobian = spec.point
    ? evaluateJacobian(symbolicJacobian, spec.point, spec.context || {}).map(row => row.map(c))
    : symbolicJacobian;
  return {
    difficulty: 'medium',
    mode: 'standard',
    concepts: [],
    hints: [],
    ...spec,
    expectedShape: jacobianShape(spec.outputs.length, spec.inputs.length),
    dependencyMatrix: dependencies,
    symbolicJacobian,
    expectedJacobian,
    classification: classifyJacobian(symbolicJacobian, dependencies),
  };
}

export const DETERMINISTIC_ROUNDS = [
  createRound({
    id: 'sample-01-basic-2x2', level: 6, title: 'Basic 2×2 Control Board',
    inputs: ['x_1', 'x_2'],
    outputs: [
      { name: 'f_1', expression: add(pow(X1, 2), X2), description: 'quadratic signal plus x₂' },
      { name: 'f_2', expression: mul(X1, X2), description: 'coupled product gauge' },
    ],
    concepts: ['jacobian-shape', 'row-output-mapping', 'column-input-mapping', 'partial-derivative-placement'],
  }),
  createRound({
    id: 'sample-02-identity', level: 8, title: 'Identity Relay',
    inputs: ['x_1', 'x_2'],
    outputs: [{ name: 'f_1', expression: X1 }, { name: 'f_2', expression: X2 }],
    concepts: ['identity-jacobian', 'structural-zeros'],
  }),
  createRound({
    id: 'sample-03-diagonal-nonlinear', level: 9, title: 'Independent Nonlinear Gauges',
    inputs: ['x_1', 'x_2'],
    outputs: [{ name: 'f_1', expression: pow(X1, 3) }, { name: 'f_2', expression: sin(X2) }],
    concepts: ['diagonal-jacobian', 'element-wise-dependency'],
  }),
  createRound({
    id: 'sample-04-rectangular-2x3', level: 7, title: 'Wide Mapping: 3 Inputs → 2 Outputs',
    inputs: ['x_1', 'x_2', 'x_3'],
    outputs: [
      { name: 'f_1', expression: add(X1, X2, X3) },
      { name: 'f_2', expression: add(mul(X1, X2), pow(X3, 2)) },
    ],
    concepts: ['rectangular-jacobian', 'shape-orientation'],
  }),
  createRound({
    id: 'sample-05-rectangular-3x2', level: 7, title: 'Tall Mapping: 2 Inputs → 3 Outputs',
    inputs: ['x_1', 'x_2'],
    outputs: [
      { name: 'g_1', expression: add(X1, X2) },
      { name: 'g_2', expression: add(X1, mul(c(-1), X2)) },
      { name: 'g_3', expression: mul(X1, X2) },
    ],
    concepts: ['rectangular-jacobian', 'shape-orientation'],
  }),
  createRound({
    id: 'sample-06-sparse', level: 10, title: 'Sparse Wiring Board',
    inputs: ['x_1', 'x_2', 'x_3'],
    outputs: [
      { name: 'f_1', expression: pow(X1, 2) },
      { name: 'f_2', expression: add(X2, X3) },
      { name: 'f_3', expression: mul(X1, X3) },
    ],
    concepts: ['sparse-jacobian', 'structural-zeros', 'dependency-map'],
  }),
  createRound({
    id: 'sample-07-dense', level: 10, title: 'Dense Cross-Coupling',
    inputs: ['x_1', 'x_2'],
    outputs: [
      { name: 'f_1', expression: add(pow(X1, 2), mul(X1, X2)) },
      { name: 'f_2', expression: add(mul(X1, X2), pow(X2, 2)) },
    ],
    concepts: ['dense-jacobian', 'cross-component-dependency'],
  }),
  createRound({
    id: 'sample-08-constant-row', level: 10, title: 'Silent Output Gauge',
    inputs: ['x_1', 'x_2'],
    outputs: [{ name: 'f_1', expression: c(5) }, { name: 'f_2', expression: add(X1, X2) }],
    concepts: ['zero-row', 'constant-output'],
  }),
  createRound({
    id: 'sample-09-unused-input', level: 10, title: 'Disconnected Input Knob',
    inputs: ['x_1', 'x_2', 'x_3'],
    outputs: [{ name: 'f_1', expression: add(X1, X2) }, { name: 'f_2', expression: mul(X1, X2) }],
    concepts: ['zero-column', 'unused-input'],
  }),
  createRound({
    id: 'sample-10-evaluated', level: 11, title: 'Slope Zero Here, Path Still Present',
    inputs: ['x_1', 'x_2'],
    outputs: [
      { name: 'f_1', expression: add(pow(X1, 2), X2) },
      { name: 'f_2', expression: mul(X1, X2) },
    ],
    point: { x_1: 0, x_2: 3 },
    concepts: ['evaluated-jacobian', 'evaluated-zero', 'structural-zero'],
  }),
  createRound({
    id: 'sample-11-relu', level: 12, title: 'Element-wise ReLU Gate',
    inputs: ['z_1', 'z_2'],
    outputs: [{ name: 'a_1', expression: relu(Z1) }, { name: 'a_2', expression: relu(Z2) }],
    point: { z_1: 2, z_2: -1 }, context: { reluDerivativeAtZero: 0 },
    note: 'This game uses ReLU′(0)=0 by convention.',
    concepts: ['neural-network-jacobian', 'activation-jacobian', 'evaluated-zero'],
  }),
  createRound({
    id: 'sample-12-affine', level: 12, title: 'Affine Layer Control Matrix',
    inputs: ['x_1', 'x_2'],
    outputs: [
      { name: 'z_1', expression: add(mul(c(2), X1), mul(c(3), X2), v('b_1')) },
      { name: 'z_2', expression: add(mul(c(-1), X1), mul(c(4), X2), v('b_2')) },
    ],
    parameterConstants: ['b_1', 'b_2'],
    concepts: ['affine-jacobian', 'neural-network-jacobian'],
  }),
];

export const INTRO_ROUNDS = [
  createRound({
    id: 'level-01-rows', level: 1, title: 'Rows Belong to Outputs', mode: 'rows-only',
    inputs: ['x_1', 'x_2'],
    outputs: [{ name: 'f_1', expression: add(X1, X2) }, { name: 'f_2', expression: X1 }, { name: 'f_3', expression: X2 }],
    concepts: ['row-output-mapping'],
  }),
  createRound({
    id: 'level-02-columns', level: 2, title: 'Columns Belong to Inputs', mode: 'columns-only',
    inputs: ['x_1', 'x_2', 'x_3', 'x_4'],
    outputs: [{ name: 'f_1', expression: add(X1, X2) }, { name: 'f_2', expression: add(X3, X4) }],
    concepts: ['column-input-mapping', 'rectangular-jacobian'],
  }),
  createRound({
    id: 'level-03-find-cell', level: 3, title: 'Find J₂₃', mode: 'find-cell', targetCell: { row: 1, column: 2 },
    inputs: ['x_1', 'x_2', 'x_3'],
    outputs: [{ name: 'f_1', expression: add(X1, X2) }, { name: 'f_2', expression: add(mul(X1, X3), X2) }],
    concepts: ['entry-notation', 'row-column-mapping'],
  }),
  createRound({
    id: 'level-04-build-row', level: 4, title: 'Build One Output Gradient Row', mode: 'row-only', targetRow: 0,
    inputs: ['x_1', 'x_2'], outputs: [{ name: 'f_1', expression: add(pow(X1, 2), X2) }],
    concepts: ['jacobian-row', 'partial-derivative-calculation'],
  }),
  createRound({
    id: 'level-05-build-column', level: 5, title: 'Build One Input Sensitivity Column', mode: 'column-only', targetColumn: 0,
    inputs: ['x_1', 'x_2'],
    outputs: [{ name: 'f_1', expression: add(pow(X1, 2), X2) }, { name: 'f_2', expression: mul(X1, X2) }],
    concepts: ['jacobian-column', 'partial-derivative-calculation'],
  }),
  createRound({
    id: 'level-13-transpose-bug', level: 13, title: 'Bug Hunter: Transposed Assembly', mode: 'repair', bugType: 'transpose',
    inputs: ['x_1', 'x_2'],
    outputs: [{ name: 'f_1', expression: add(pow(X1, 2), X2) }, { name: 'f_2', expression: mul(X1, X2) }],
    concepts: ['transpose-detection', 'correct-value-wrong-cell'],
  }),
  createRound({
    id: 'level-14-challenge', level: 14, title: 'Assembly Challenge: Mixed Wiring', mode: 'challenge', difficulty: 'advanced',
    inputs: ['x_1', 'x_2', 'x_3'],
    outputs: [
      { name: 'f_1', expression: add(pow(X1, 2), mul(X2, X3)) },
      { name: 'f_2', expression: add(mul(c(2), X1, X2), pow(X3, 2)) },
      { name: 'f_3', expression: add(X1, exp(X2)) },
      { name: 'f_4', expression: add(mul(X1, X3), pow(X2, 3)) },
    ],
    concepts: ['free-build', 'rectangular-jacobian', 'sparse-jacobian', 'interpretation'],
  }),
];

export const ALL_STATIC_ROUNDS = [...INTRO_ROUNDS, ...DETERMINISTIC_ROUNDS];

export function getRoundsForLevel(level) {
  return ALL_STATIC_ROUNDS.filter(round => round.level === Number(level));
}

export function getRoundById(id) {
  return ALL_STATIC_ROUNDS.find(round => round.id === id) || null;
}
