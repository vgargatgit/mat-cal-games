import { test, equal, assert } from './test-utils.js';
import { c, v, dv, sum, product, power, fn } from '../js/data/levels.js';
import { deriveExpression } from '../js/math/symbolic-derivative.js';
import { expressionsEquivalent } from '../js/math/expression-validator.js';

function derivativeEquals(expression, variable, expected, context = {}) {
  const actual = deriveExpression(expression, variable, context);
  assert(expressionsEquivalent(actual, expected), `Derivative was not equivalent to ${expected}`);
}

export const derivativeTests = [
  test('constant rule d(7)/dx = 0', () => derivativeEquals(c(7), 'x', '0')),
  test('constant multiple d(4x)/dx = 4', () => derivativeEquals(product(c(4), v('x')), 'x', '4')),
  test('independent input ∂y/∂x = 0', () => derivativeEquals(v('y'), 'x', '0')),
  test('frozen multiplier ∂(x²y)/∂x = 2xy', () => derivativeEquals(product(power(v('x'), 2), v('y')), 'x', '2xy')),
  test('different active variable ∂(x²y)/∂y = x²', () => derivativeEquals(product(power(v('x'), 2), v('y')), 'y', 'x^2')),
  test('sum rule ∂(x²+y)/∂x = 2x', () => derivativeEquals(sum(power(v('x'), 2), v('y')), 'x', '2x')),
  test('product rule d(x² sin x)/dx', () => derivativeEquals(product(power(v('x'), 2), fn('sin', v('x'))), 'x', '2x sin(x)+x^2 cos(x)')),
  test('chain rule ∂(x+y)²/∂x', () => derivativeEquals(power(sum(v('x'), v('y')), 2), 'x', '2(x+y)')),
  test('nested product ∂sin(xy)/∂x', () => derivativeEquals(fn('sin', product(v('x'), v('y'))), 'x', 'y cos(xy)')),
  test('declared dependency d(x²y(x))/dx', () => derivativeEquals(product(power(v('x'), 2), dv('y', ['x'])), 'x', '2xy+x^2 dy/dx', { dependencies: { y: ['x'] } })),
  test('multiple paths add contributions', () => derivativeEquals(sum(power(v('x'), 2), product(c(3), v('x'))), 'x', '2x+3')),
  test('neuron weight derivative', () => derivativeEquals(sum(product(v('w1'), v('x1')), product(v('w2'), v('x2')), v('b')), 'w1', 'x1')),
  test('neuron input derivative', () => derivativeEquals(sum(product(v('w1'), v('x1')), product(v('w2'), v('x2')), v('b')), 'x2', 'w2')),
  test('bias derivative', () => derivativeEquals(sum(product(v('w1'), v('x1')), product(v('w2'), v('x2')), v('b')), 'b', '1'))
];
