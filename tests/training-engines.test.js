import test from 'node:test';
import assert from 'node:assert/strict';
import { chainGradient, deadNeuronIndices, relu, reluDerivative } from '../src/games/relu-gatekeeper/engine.js';
import { LANDSCAPES, converged, gradientStep, runDescent } from '../src/games/gradient-descent-navigator/engine.js';
import { BOSS_NETWORK, backward, forward, matrixVector, transpose } from '../src/games/backpropagation-boss/engine.js';
import {
  changeActivation,
  changeDepth,
  chainRuleExpression,
  createSandboxState,
  gradientBehavior,
  isBackwardComplete,
  stepBackward,
  stepForward,
} from '../src/app/shell/inside-backprop-model.js';

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

test('sandbox composes one local Jacobian per backward step in chain-rule order', () => {
  let state = createSandboxState({ depth: 3, activation: 'relu' });
  state = stepBackward(state);
  assert.deepEqual(state.composedJacobians, [3]);
  assert.equal(chainRuleExpression(state), 'J₃ᵀ · ∇output L');
  state = stepBackward(state);
  assert.deepEqual(state.composedJacobians, [2, 3]);
  state = stepBackward(state);
  assert.equal(chainRuleExpression(state), 'J₁ᵀ · J₂ᵀ · J₃ᵀ · ∇output L');
  assert.equal(isBackwardComplete(state), true);
  assert.deepEqual(stepBackward(state).composedJacobians, [1, 2, 3]);
});

test('sandbox supports depths one through five and never crosses traversal boundaries', () => {
  for (let depth = 1; depth <= 5; depth += 1) {
    let state = createSandboxState({ depth });
    for (let step = 0; step < depth + 2; step += 1) state = stepBackward(state);
    assert.equal(state.composedJacobians.length, depth);
    assert.equal(state.gradientHistory.length, depth + 1);
  }
  assert.equal(createSandboxState({ depth: 0 }).depth, 1);
  assert.equal(createSandboxState({ depth: 9 }).depth, 5);
});

test('forward stepping does not add backward-product terms', () => {
  let state = createSandboxState({ depth: 2 });
  state = stepForward(stepBackward(state));
  assert.equal(state.direction, 'forward');
  assert.deepEqual(state.composedJacobians, []);
  state = stepForward(stepForward(stepForward(state)));
  assert.equal(state.forwardStep, 3);
});

test('depth and activation changes reset accumulated composition', () => {
  const composed = stepBackward(createSandboxState({ depth: 3 }));
  const deeper = changeDepth(composed, 5);
  assert.equal(deeper.depth, 5);
  assert.deepEqual(deeper.composedJacobians, []);
  const sigmoid = changeActivation(stepBackward(deeper), 'sigmoid');
  assert.equal(sigmoid.activation, 'sigmoid');
  assert.deepEqual(sigmoid.composedJacobians, []);
});

test('gradient history distinguishes vanishing, surviving, and growing products', () => {
  assert.equal(gradientBehavior(.2), 'Vanishing');
  assert.equal(gradientBehavior(.9), 'Surviving');
  assert.equal(gradientBehavior(2), 'Growing');

  let sigmoid = createSandboxState({ depth: 5, activation: 'sigmoid' });
  let linear = createSandboxState({ depth: 5, activation: 'linear' });
  for (let index = 0; index < 5; index += 1) {
    sigmoid = stepBackward(sigmoid);
    linear = stepBackward(linear);
  }
  assert.equal(sigmoid.gradientHistory.at(-1).behavior, 'Vanishing');
  assert.equal(linear.gradientHistory.at(-1).behavior, 'Growing');
});
