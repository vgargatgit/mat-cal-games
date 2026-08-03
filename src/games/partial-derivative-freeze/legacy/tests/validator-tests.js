import { test, assert, equal } from './test-utils.js';
import { expressionsEquivalent, parseExpression } from '../js/math/expression-validator.js';
import { SAMPLE_ROUNDS } from '../js/data/levels.js';
import { validateRoundAnswer } from '../js/engine/answer-validator.js';

const round = SAMPLE_ROUNDS.find((item) => item.id === 'sample-002');
function baseAnswer(overrides = {}) {
  return { shape: 'scalar', activeVariable: 'x', frozenVariables: ['y'], termDependencies: { 0: true }, selectedRules: ['constant-multiple', 'power'], finalExpression: '2xy', hintsUsed: 0, attemptNumber: 1, ...overrides };
}

export const validatorTests = [
  test('accepts reordered multiplication', () => assert(expressionsEquivalent('2*x*y', '2yx'))),
  test('accepts parenthesized constant multiplication', () => assert(expressionsEquivalent('2*x*y', 'y(2x)'))),
  test('accepts multiplication dot normalization', () => assert(expressionsEquivalent('2*x*y', '2x·y'))),
  test('accepts addition of zero', () => assert(expressionsEquivalent('2*x*y', '2xy+0'))),
  test('accepts reordered addition', () => assert(expressionsEquivalent('2x+3', '3+2x'))),
  test('parses subscript-like identifiers w1 and x2', () => assert(expressionsEquivalent(parseExpression('w1*x2'), 'x2w1'))),
  test('valid full reasoning chain passes', () => assert(validateRoundAnswer(round, baseAnswer()).correct)),
  test('removed frozen multiplier is diagnosed', () => {
    const result = validateRoundAnswer(round, baseAnswer({ finalExpression: '2x' }));
    assert(!result.correct); assert(result.misconceptions.includes('removed-frozen-multiplier'));
  }),
  test('freezing entire mixed term is diagnosed', () => {
    const result = validateRoundAnswer(round, baseAnswer({ termDependencies: { 0: false }, finalExpression: '0' }));
    assert(result.misconceptions.includes('froze-mixed-term'));
  }),
  test('incorrect shape is diagnosed', () => {
    const result = validateRoundAnswer(round, baseAnswer({ shape: 'vector' }));
    assert(result.misconceptions.includes('incorrect-shape'));
  }),
  test('wrong active variable is diagnosed', () => {
    const result = validateRoundAnswer(round, baseAnswer({ activeVariable: 'y' }));
    assert(result.misconceptions.includes('wrong-active-variable'));
  })
];
