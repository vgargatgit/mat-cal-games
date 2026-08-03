import test from 'node:test';
import assert from 'node:assert/strict';
import { chainGradient, deadNeuronIndices, relu, reluDerivative } from '../src/games/relu-gatekeeper/engine.js';
import { LANDSCAPES, converged, gradientStep, runDescent } from '../src/games/gradient-descent-navigator/engine.js';
import { BOSS_NETWORK, backward, forward, matrixVector, transpose } from '../src/games/backpropagation-boss/engine.js';

test('ReLU forward values and local derivatives stay distinct', () => {
  assert.equal(relu(3), 3);
  assert.equal(reluDerivative(3), 1);
  assert.equal(relu(-2), 0);
  assert.equal(reluDerivative(-2), 0);
  assert.equal(reluDerivative(0), 0);
});

test('one closed ReLU gate blocks a serial gradient path', () => {
  assert.equal(chainGradient([2, 1, .1], 4), 4);
  assert.equal(chainGradient([2, -1, .1], 4), 0);
  assert.deepEqual(deadNeuronIndices([.01, -2, 0, 5]), [1, 2]);
});

test('gradient descent subtracts while ascent adds the local gradient', () => {
  const bowl = LANDSCAPES[0];
  assert.deepEqual(gradientStep(bowl, [2, -1], .25, 'downhill'), [1.5, -.75]);
  assert.deepEqual(gradientStep(bowl, [2, -1], .25, 'uphill'), [2.5, -1.25]);
});

test('every landscape converges with its documented learning rate', () => {
  for (const landscape of LANDSCAPES) {
    const path = runDescent(landscape, landscape.start, landscape.learningRate, 100);
    assert.ok(path.some((point) => converged(landscape, point)), landscape.title);
  }
});

test('matrix utilities preserve backpropagation shapes', () => {
  assert.deepEqual(matrixVector([[1, 2], [3, 4]], [2, 1]), [4, 10]);
  assert.deepEqual(transpose([[1, 2, 3]]), [[1], [2], [3]]);
});

test('tiny network forward pass matches the displayed boss state', () => {
  assert.deepEqual(forward(BOSS_NETWORK), { z1: [3, .5, -4.5], h: [3, .5, 0], prediction: 2, loss: .5 });
});

test('complete backward pass follows transpose, ReLU mask, and outer products', () => {
  const result = backward(BOSS_NETWORK);
  assert.deepEqual(result.dH, [1, -2, .5]);
  assert.deepEqual(result.mask, [1, 1, 0]);
  assert.deepEqual(result.dZ1, [1, -2, 0]);
  assert.deepEqual(result.dInput, [0, -2]);
  assert.deepEqual(result.dW2, [[3, .5, 0]]);
  assert.deepEqual(result.dW1, [[1, -2], [-2, 4], [0, -0]]);
});
