import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shape, classifyShape, derivativeShape, transposeShape,
  canMultiply, multiplyShapes, sameShape
} from '../js/engine/shape-math.js';

test('classifies scalar, vectors, and matrices', () => {
  assert.equal(classifyShape(1, 1), 'scalar');
  assert.equal(classifyShape(1, 4), 'row-vector');
  assert.equal(classifyShape(3, 1), 'column-vector');
  assert.equal(classifyShape(2, 5), 'matrix');
});

test('uses numerator layout for derivative shapes', () => {
  assert.deepEqual(derivativeShape(1, 1), shape(1, 1));
  assert.deepEqual(derivativeShape(1, 4), shape(1, 4));
  assert.deepEqual(derivativeShape(3, 1), shape(3, 1));
  assert.deepEqual(derivativeShape(2, 5), shape(2, 5));
});

test('transposes dimensions', () => {
  assert.deepEqual(transposeShape(shape(3, 1)), shape(1, 3));
  assert.deepEqual(transposeShape(shape(2, 5)), shape(5, 2));
});

test('checks and multiplies compatible shapes', () => {
  const left = shape(2, 3);
  const right = shape(3, 4);
  assert.equal(canMultiply(left, right), true);
  assert.equal(canMultiply(left, shape(4, 5)), false);
  assert.equal(sameShape(multiplyShapes(left, right), shape(2, 4)), true);
  assert.throws(() => multiplyShapes(left, shape(4, 5)));
});
