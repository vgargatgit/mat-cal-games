import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../js/data/levels.js';
import { generateLevelQuestions, validateQuestion } from '../js/engine/question-generator.js';
import { classifyShape } from '../js/engine/shape-math.js';

test('generates the requested number of valid questions for every level', () => {
  for (const level of LEVELS) {
    const questions = generateLevelQuestions(level.id, 50, 12345, { misconceptions: {} });
    assert.equal(questions.length, 50);
    for (const question of questions) {
      assert.equal(validateQuestion(question), true, `Invalid ${question.id}`);
      assert.equal(question.expected.semanticType, classifyShape(question.expected.rows, question.expected.columns));
      if (question.kind === 'multiply') {
        assert.equal(question.metadata.left.columns, question.metadata.right.rows);
        assert.equal(question.expected.rows, question.metadata.left.rows);
        assert.equal(question.expected.columns, question.metadata.right.columns);
      }
      if (question.kind === 'validity') {
        assert.notEqual(question.metadata.left.columns, question.metadata.right.rows);
      }
    }
  }
});

test('generates at least 1,000 invariant-safe mixed questions', () => {
  let total = 0;
  for (let seed = 1; seed <= 10; seed += 1) {
    for (const level of LEVELS) {
      const questions = generateLevelQuestions(level.id, 12, seed * 9187, { misconceptions: { 'reversed-jacobian': 3 } });
      total += questions.length;
      assert.ok(questions.every(validateQuestion));
    }
  }
  assert.ok(total >= 1000);
});

test('does not require reasoning tiles for scalar derivative rounds', () => {
  const questions = generateLevelQuestions(2, 6, 12345, { misconceptions: {} });
  for (const question of questions) {
    assert.equal(question.expected.semanticType, 'scalar');
    assert.deepEqual(question.metadata.reasonIds, []);
  }
});

test('uses a distinct expression in every Level 2 round', () => {
  const questions = generateLevelQuestions(2, 6, 12345, { misconceptions: {} });
  const expressions = questions.map((question) => question.contextLatex + '|' + question.derivativeLatex);
  assert.equal(new Set(expressions).size, questions.length);
});

test('shows the bias in the Level 2 loss expression differentiated by bias', () => {
  const questions = generateLevelQuestions(2, 6, 12345, { misconceptions: {} });
  const biasQuestion = questions.find((question) => question.id === 'sample-loss-bias');
  assert.equal(biasQuestion.contextLatex, 'L=(b-y)^2,\\quad b\\in\\mathbb{R}');
  assert.equal(biasQuestion.derivativeLatex, '\\frac{\\partial L}{\\partial b}');
});
