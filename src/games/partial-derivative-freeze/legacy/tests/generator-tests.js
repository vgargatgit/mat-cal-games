import { test, assert, equal } from './test-utils.js';
import { generateQuestion } from '../js/engine/question-generator.js';
import { finiteDifferenceCheck } from '../js/engine/answer-validator.js';
import { expressionSize, topLevelTerms } from '../js/math/expression-model.js';

export const generatorTests = [
  test('seeded generation is deterministic', () => {
    const a = generateQuestion(4, 41728); const b = generateQuestion(4, 41728);
    equal(JSON.stringify(a.expression), JSON.stringify(b.expression));
    equal(JSON.stringify(a.expectedAnswer.derivativeAst), JSON.stringify(b.expectedAnswer.derivativeAst));
  }),
  test('2,000 generated questions satisfy invariants', () => {
    let finiteChecks = 0;
    for (let i = 0; i < 2000; i += 1) {
      const level = (i % 12) + 1;
      const round = generateQuestion(level, 1000 + i * 7919);
      assert(round.id && round.expression && round.expectedAnswer, `Round ${i} missing required structure`);
      assert(round.variables.some((variable) => variable.name === round.activeVariable) || round.taskKind === 'gradient', `Round ${i} active variable not declared`);
      assert(expressionSize(round.expression) <= 40, `Round ${i} expression too large`);
      assert(topLevelTerms(round.expression).length <= 4, `Round ${i} has too many additive terms`);
      if (round.taskKind === 'gradient') {
        equal(round.expectedAnswer.components.length, round.expectedAnswer.componentOrder.length);
      }
      const numeric = finiteDifferenceCheck(round);
      if (!numeric.skipped) {
        finiteChecks += 1;
        assert(numeric.passed, `Finite-difference mismatch at round ${i}: ${numeric.error}`);
      }
    }
    assert(finiteChecks > 800, 'Expected broad numerical derivative coverage');
  })
];
