import { test, assert, equal } from './test-utils.js';
import { dependsOn, classifyVariableRole, findDependencyPaths, classifyTerms } from '../js/math/dependency-analysis.js';
import { v, dv, sum, product, power, c } from '../js/data/levels.js';

export const dependencyTests = [
  test('independent y does not depend on x', () => equal(dependsOn(v('y'), 'x', {}), false)),
  test('active x depends on itself', () => equal(dependsOn(v('x'), 'x', {}), true)),
  test('declared y(x) depends on x', () => equal(dependsOn(dv('y', ['x']), 'x', { dependencies: { y: ['x'] } }), true)),
  test('undeclared y remains independent', () => equal(dependsOn(v('y'), 'x', {}), false)),
  test('mixed term x²y changes through x', () => equal(dependsOn(product(power(v('x'), 2), v('y')), 'x', {}), true)),
  test('term scanner separates changing and unchanged terms', () => {
    const terms = classifyTerms(sum(product(power(v('x'), 2), v('y')), product(c(3), v('y'))), 'x', {});
    equal(terms[0].kind, 'mixed'); equal(terms[1].kind, 'unchanged');
  }),
  test('dependent variable cannot be classified frozen', () => equal(classifyVariableRole('y', 'x', { dependencies: { y: ['x'] } }), 'dependent')),
  test('finds both dependency paths', () => {
    const graph = { edges: [{ from: 'x', to: 'u' }, { from: 'u', to: 'f' }, { from: 'x', to: 'v' }, { from: 'v', to: 'f' }] };
    const paths = findDependencyPaths('f', 'x', graph);
    equal(paths.length, 2); assert(paths.every((path) => path.length === 2));
  })
];
