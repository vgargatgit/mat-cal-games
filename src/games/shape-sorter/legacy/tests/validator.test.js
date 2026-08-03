import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, detectMisconception } from '../js/engine/validator.js';
import { shape } from '../js/engine/shape-math.js';

function question(expected, overrides = {}) {
  return {
    kind: 'shape',
    expected,
    explanation: 'Correct explanation.',
    metadata: { reasonIds: ['output-rows', 'input-columns'], inputCount: expected.columns, outputCount: expected.rows },
    ...overrides
  };
}

test('accepts correct Jacobian shape and reasoning', () => {
  const result = validateSubmission(question(shape(2, 4)), {
    category: 'matrix', rows: 2, columns: 4,
    reasons: ['output-rows', 'input-columns']
  });
  assert.equal(result.correct, true);
});

test('accepts a scalar 1 x 1 answer without reasoning tiles', () => {
  const result = validateSubmission(question(shape(1, 1), {
    metadata: { reasonIds: [], inputCount: 1, outputCount: 1 }
  }), {
    category: 'scalar', rows: 1, columns: 1, reasons: []
  });
  assert.equal(result.correct, true);
});

test('detects reversed Jacobian dimensions', () => {
  const result = validateSubmission(question(shape(2, 4)), {
    category: 'matrix', rows: 4, columns: 2,
    reasons: ['output-rows', 'input-columns']
  });
  assert.equal(result.correct, false);
  assert.equal(result.misconception, 'reversed-jacobian');
});

test('detects numerator-layout gradient orientation', () => {
  const diagnostic = detectMisconception(question(shape(1, 4)), {
    category: 'column-vector', rows: 4, columns: 1, reasons: []
  });
  assert.equal(diagnostic.id, 'gradient-orientation');
});

test('accepts the Level 3 row-vector shape without reasoning tiles', () => {
  const result = validateSubmission(question(shape(1, 3)), {
    category: 'row-vector', rows: 1, columns: 3, reasons: []
  });
  assert.equal(result.correct, true);
  assert.equal(result.reasonCorrect, false);
});

test('accepts invalid multiplication answer', () => {
  const q = { kind: 'validity', expected: shape(1, 1), explanation: 'Invalid.', metadata: {} };
  assert.equal(validateSubmission(q, { validity: false }).correct, true);
  assert.equal(validateSubmission(q, { validity: true }).misconception, 'inner-dimension-mistake');
});
