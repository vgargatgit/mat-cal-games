import { c, v, add, mul, pow, sin, exp, relu, parseExpression, toPlain, collectVariables, containsVariable, evaluate } from '../js/math/ast.js';
import { derivative } from '../js/math/derivative.js';
import { equivalentExpressions, safeParse } from '../js/math/equivalence.js';
import { jacobianShape, computeJacobian, dependencyMatrix, classifyJacobian, evaluateJacobian, isZeroExpression, numericalJacobian, verifyJacobianNumerically } from '../js/math/jacobian.js';
import { DETERMINISTIC_ROUNDS, createRound } from '../js/data/rounds.js';
import { generateRound } from '../js/engine/generator.js';
import { GameEngine } from '../js/engine/game-engine.js';
import { defaultStore, validateStore } from '../js/storage.js';
import { latexToReadableText } from '../js/math-renderer.js';

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message = '') {
  if (actual !== expected) throw new Error(`${message ? `${message}: ` : ''}expected ${expected}, received ${actual}`);
}

function approx(actual, expected, tolerance = 1e-6, message = '') {
  if (Math.abs(actual - expected) > tolerance * Math.max(1, Math.abs(actual), Math.abs(expected))) {
    throw new Error(`${message ? `${message}: ` : ''}expected approximately ${expected}, received ${actual}`);
  }
}

function matrixEquivalent(actual, expected, message = 'Matrices differ') {
  equal(actual.length, expected.length, `${message} row count`);
  actual.forEach((row, i) => {
    equal(row.length, expected[i].length, `${message} column count at row ${i}`);
    row.forEach((cell, j) => assert(equivalentExpressions(cell, expected[i][j]).equivalent, `${message} at row ${i + 1}, column ${j + 1}`));
  });
}

function test(name, fn) {
  return { name, fn };
}

const X1 = v('x_1');
const X2 = v('x_2');
const X3 = v('x_3');

export const TESTS = [
  test('Shape rule: 2 outputs and 3 inputs gives 2×3', () => {
    const shape = jacobianShape(2, 3);
    equal(shape.rows, 2); equal(shape.columns, 3); equal(shape.semanticType, 'matrix');
  }),
  test('Shape rule: 3 outputs and 2 inputs gives 3×2', () => {
    const shape = jacobianShape(3, 2);
    equal(shape.rows, 3); equal(shape.columns, 2);
  }),
  test('Entry mapping: J₂₃ is ∂f₂/∂x₃', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-04-rectangular-2x3');
    assert(equivalentExpressions(round.expectedJacobian[1][2], mul(c(2), X3)).equivalent);
  }),
  test('Unicode math fallback keeps controlled LaTeX readable offline', () => {
    equal(latexToReadableText('\\mathbf{f}:\\mathbb{R}^{n}\\rightarrow\\mathbb{R}^{m}'), 'f:ℝⁿ→ℝᵐ');
    equal(latexToReadableText('J_{21}=\\frac{\\partial f_{2}}{\\partial x_{1}}'), 'J₂₁=(∂ f₂)/(∂ x₁)');
    equal(latexToReadableText('\\begin{bmatrix}2x_1&1\\\\x_2&x_1\\end{bmatrix}'), '[2x₁ 1; x₂ x₁]');
  }),
  test('Parser accepts implicit multiplication and equivalent sums', () => {
    assert(equivalentExpressions(parseExpression('x_1+x_1'), parseExpression('2x_1')).equivalent);
    assert(equivalentExpressions(parseExpression('x_1x_2'), mul(X1, X2)).equivalent);
    equal(toPlain(parseExpression('2x_1+x_1')), '3*x_1');
  }),
  test('Empty derivative input returns actionable feedback', () => {
    const result = safeParse('   ');
    equal(result.ok, false);
    equal(result.error, 'Enter a derivative expression before applying it.');
  }),
  test('Basic symbolic derivative rules', () => {
    assert(equivalentExpressions(derivative(add(pow(X1, 2), X2), 'x_1'), mul(c(2), X1)).equivalent);
    assert(equivalentExpressions(derivative(mul(X1, X2), 'x_1'), X2).equivalent);
    assert(equivalentExpressions(derivative(sin(X2), 'x_2'), { type: 'cos', arg: X2 }).equivalent);
  }),
  test('Identity Jacobians I₂, I₃, I₄', () => {
    for (const size of [2, 3, 4]) {
      const inputs = Array.from({ length: size }, (_, i) => `x_${i + 1}`);
      const jacobian = computeJacobian(inputs.map(v), inputs);
      const classification = classifyJacobian(jacobian, dependencyMatrix(inputs.map(v), inputs));
      assert(classification.identity, `I${size} should be identity`);
      jacobian.forEach((row, i) => row.forEach((cell, j) => {
        assert(equivalentExpressions(cell, c(i === j ? 1 : 0)).equivalent);
      }));
    }
  }),
  test('Diagonal nonlinear Jacobian has zero off-diagonal entries', () => {
    const outputs = [pow(X1, 2), sin(X2), exp(X3)];
    const jacobian = computeJacobian(outputs, ['x_1', 'x_2', 'x_3']);
    const classification = classifyJacobian(jacobian, dependencyMatrix(outputs, ['x_1', 'x_2', 'x_3']));
    assert(classification.diagonal);
    jacobian.forEach((row, i) => row.forEach((cell, j) => { if (i !== j) assert(isZeroExpression(cell)); }));
  }),
  test('Sparse sample dependency matrix agrees with derivative zeros', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-06-sparse');
    round.dependencyMatrix.forEach((row, i) => row.forEach((depends, j) => {
      if (!depends) assert(isZeroExpression(round.symbolicJacobian[i][j]), `Missing zero at ${i},${j}`);
    }));
    assert(round.classification.sparse);
  }),
  test('Constant output produces a zero row', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-08-constant-row');
    assert(round.symbolicJacobian[0].every(isZeroExpression));
    assert(round.classification.zeroRows.includes(0));
  }),
  test('Unused input produces a zero column', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-09-unused-input');
    assert(round.symbolicJacobian.every(row => isZeroExpression(row[2])));
    assert(round.classification.zeroColumns.includes(2));
  }),
  test('Affine transformation Jacobian equals coefficient matrix W', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-12-affine');
    const expected = [[c(2), c(3)], [c(-1), c(4)]];
    matrixEquivalent(round.symbolicJacobian, expected);
    assert(round.classification.constant);
  }),
  test('Element-wise ReLU Jacobian evaluates to diag(1,0) away from zero', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-11-relu');
    matrixEquivalent(round.expectedJacobian, [[c(1), c(0)], [c(0), c(0)]]);
    assert(round.classification.diagonal);
  }),
  test('Evaluated Jacobian preserves symbolic dependency while value is zero', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-10-evaluated');
    matrixEquivalent(round.expectedJacobian, [[c(0), c(1)], [c(3), c(0)]]);
    assert(round.dependencyMatrix[0][0], 'f1 structurally depends on x1');
    assert(isZeroExpression(round.expectedJacobian[0][0]), 'evaluated derivative should be zero');
    assert(!isZeroExpression(round.symbolicJacobian[0][0]), 'symbolic derivative should not be structurally zero');
  }),
  test('Numerical Jacobian matches symbolic Jacobian for polynomial sample', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-07-dense');
    const result = verifyJacobianNumerically(round.outputs.map(output => output.expression), round.inputs, round.symbolicJacobian, [
      { x_1: -1.2, x_2: 0.7 }, { x_1: 0.4, x_2: 2.1 }, { x_1: 2.5, x_2: -0.3 },
    ]);
    assert(result.ok, JSON.stringify(result.failures[0]));
  }),
  test('Symbolic equivalence accepts commuted and combined forms', () => {
    assert(equivalentExpressions('x_1+2x_2', '2x_2+x_1').equivalent);
    assert(equivalentExpressions('x_1+x_1', '2x_1').equivalent);
    assert(!equivalentExpressions('x_1+x_2', 'x_1-x_2').equivalent);
  }),
  test('Misconception: reversed rectangular dimensions', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-04-rectangular-2x3');
    const engine = new GameEngine(round);
    const result = engine.validateShape(3, 2);
    equal(result.ok, false); equal(result.misconception, 'reversed-dimensions');
  }),
  test('Misconception: transposed Jacobian is diagnosed', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-01-basic-2x2');
    const engine = new GameEngine(round);
    engine.state.submissions = [
      [round.expectedJacobian[0][0], round.expectedJacobian[1][0]],
      [round.expectedJacobian[0][1], round.expectedJacobian[1][1]],
    ];
    const result = engine.validateMatrix();
    equal(result.ok, false); equal(result.misconception, 'transpose');
  }),
  test('Misconception: correct derivative in wrong cell', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-01-basic-2x2');
    const engine = new GameEngine(round);
    engine.state.submissions = round.expectedJacobian.map(row => [...row]);
    [engine.state.submissions[0][0], engine.state.submissions[0][1]] = [engine.state.submissions[0][1], engine.state.submissions[0][0]];
    const result = engine.validateMatrix();
    equal(result.ok, false); equal(result.misconception, 'wrong-cell');
  }),
  test('Misconception: false diagonal assumption', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-07-dense');
    const engine = new GameEngine(round);
    const result = engine.validateClassification(['square', 'diagonal', 'input-dependent']);
    equal(result.ok, false); equal(result.misconception, 'false-diagonal');
  }),
  test('Misconception: square does not imply identity', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-07-dense');
    const engine = new GameEngine(round);
    const result = engine.validateClassification(['square', 'identity', 'input-dependent']);
    equal(result.ok, false); equal(result.misconception, 'square-means-identity');
  }),
  test('Misconception: evaluated zero is not no dependency', () => {
    const round = DETERMINISTIC_ROUNDS.find(item => item.id === 'sample-10-evaluated');
    const engine = new GameEngine(round);
    const submitted = round.dependencyMatrix.map(row => [...row]);
    submitted[0][0] = false;
    const result = engine.validateDependencies(submitted);
    equal(result.ok, false); equal(result.misconception, 'evaluated-zero');
  }),
  test('Progress schema validation accepts default and rejects invalid data', () => {
    assert(validateStore(defaultStore()).ok);
    assert(!validateStore({ schemaVersion: 1 }).ok);
  }),
  test('Generator creates deterministic output for the same seed', () => {
    const a = generateRound(10, 73541, 'sparse');
    const b = generateRound(10, 73541, 'sparse');
    equal(JSON.stringify(a.outputs), JSON.stringify(b.outputs));
    equal(JSON.stringify(a.expectedJacobian), JSON.stringify(b.expectedJacobian));
  }),
  test('Generator invariants across 2,000 questions', () => {
    const families = ['identity', 'diagonal', 'rectangular', 'sparse', 'dense', 'polynomial', 'evaluated', 'affine', 'activation', 'repair'];
    for (let index = 0; index < 2000; index += 1) {
      const family = families[index % families.length];
      const level = family === 'identity' ? 8 : family === 'diagonal' ? 9 : family === 'evaluated' ? 11 : ['affine', 'activation'].includes(family) ? 12 : family === 'repair' ? 13 : family === 'rectangular' ? 7 : index % 2 ? 10 : 14;
      const round = generateRound(level, 1009 + index * 3571, family);
      const m = round.outputs.length;
      const n = round.inputs.length;
      assert(m >= 1 && m <= 4 && n >= 1 && n <= 4, `Bounds failed at ${index}`);
      equal(round.expectedShape.rows, m); equal(round.expectedShape.columns, n);
      equal(round.symbolicJacobian.length, m); equal(round.dependencyMatrix.length, m);
      round.symbolicJacobian.forEach((row, i) => {
        equal(row.length, n); equal(round.dependencyMatrix[i].length, n);
        row.forEach((cell, j) => {
          assert(cell && typeof cell === 'object', `Missing cell ${i},${j} at ${index}`);
          const syntacticDependency = containsVariable(round.outputs[i].expression, round.inputs[j]);
          equal(round.dependencyMatrix[i][j], syntacticDependency, `Dependency mismatch at ${index}:${i},${j}`);
          if (!syntacticDependency) assert(isZeroExpression(cell), `Nonzero derivative without dependency at ${index}:${i},${j}`);
        });
      });
      if (family === 'identity') assert(round.classification.identity, `Identity classification failed at ${index}`);
      if (family === 'diagonal' || family === 'activation') assert(round.classification.diagonal, `Diagonal classification failed at ${index}`);
      if (family === 'rectangular') assert(round.classification.rectangular, `Rectangular classification failed at ${index}`);
      if (family === 'sparse') assert(round.classification.sparse, `Sparse classification failed at ${index}`);
      if (family === 'dense') assert(round.classification.dense, `Dense classification failed at ${index}`);
      if (family === 'affine') assert(round.classification.constant, `Affine constant classification failed at ${index}`);

      const variables = new Set();
      round.outputs.forEach(output => collectVariables(output.expression, variables));
      const basePoint = Object.fromEntries([...variables].map((name, variableIndex) => [name, ((variableIndex + index) % 5) - 2 || 0.75]));
      if (family === 'activation') Object.assign(basePoint, round.point);
      const points = [basePoint, Object.fromEntries([...variables].map((name, variableIndex) => [name, 0.6 + variableIndex * 0.4])), Object.fromEntries([...variables].map((name, variableIndex) => [name, -1.3 - variableIndex * 0.2]))];
      if (family === 'activation') {
        points.forEach((point, pointIndex) => round.inputs.forEach((name, variableIndex) => { point[name] = (pointIndex + variableIndex) % 2 ? -1.5 - variableIndex : 1.5 + variableIndex; }));
      }
      const numerical = verifyJacobianNumerically(round.outputs.map(output => output.expression), round.inputs, round.symbolicJacobian, points, 2e-4);
      assert(numerical.ok, `Numerical verification failed at question ${index}: ${JSON.stringify(numerical.failures[0])}`);
    }
  }),
];

export async function runAllTests(onProgress = null) {
  const results = [];
  const startedAt = performance.now();
  for (let index = 0; index < TESTS.length; index += 1) {
    const current = TESTS[index];
    const testStarted = performance.now();
    try {
      await current.fn();
      results.push({ name: current.name, ok: true, durationMs: performance.now() - testStarted });
    } catch (error) {
      results.push({ name: current.name, ok: false, durationMs: performance.now() - testStarted, error: error instanceof Error ? error.message : String(error) });
    }
    onProgress?.(results[results.length - 1], index + 1, TESTS.length);
  }
  return {
    ok: results.every(result => result.ok),
    passed: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    durationMs: performance.now() - startedAt,
    results,
  };
}
