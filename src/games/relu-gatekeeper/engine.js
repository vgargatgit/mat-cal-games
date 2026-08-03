export const relu = (value) => Math.max(0, value);
export const reluDerivative = (value) => value > 0 ? 1 : 0;

export function gradientPasses(value, upstream = 1) {
  return reluDerivative(value) * upstream !== 0;
}

export function chainGradient(values, upstream = 1) {
  return values.reduceRight((gradient, value) => gradient * reluDerivative(value), upstream);
}

export function deadNeuronIndices(values) {
  return values.flatMap((value, index) => reluDerivative(value) === 0 ? [index] : []);
}

export const GATE_STAGES = [
  {
    title: 'Read one gate',
    objective: 'Use ∂L/∂z = (∂L/∂a) × ReLU′(z), and choose the local factor ReLU′(z) from the pre-activation z.',
    questions: [-3, 2.5, 0, -0.2, 4, 1.1].map((value) => ({
      kind: 'gate', value,
      prompt: `A neuron receives z = ${value}. What happens to the backward gradient?`,
      hint: 'The gate checks the pre-activation z. Positive means derivative 1; zero or negative means derivative 0.',
    })),
  },
  {
    title: 'Output is not derivative',
    objective: 'Separate what ReLU sends forward from what its Jacobian sends backward.',
    questions: [3, -4, .4, -1.5].map((value) => ({
      kind: 'compare', value,
      prompt: `ReLU(${value}) = ${relu(value)}. Which local derivative belongs on the backward wire?`,
      hint: 'The output may be 3 or 0, but the derivative is only 1 or 0.',
    })),
  },
  {
    title: 'Guard a chain',
    objective: 'Predict whether an incoming gradient survives every activation gate.',
    questions: [
      { values: [2, 1, 4] }, { values: [3, -1, 2] }, { values: [.5, .2, .1] }, { values: [1, 0, 5] },
    ].map(({ values }) => ({ kind: 'chain', values, prompt: `The backward signal crosses z = [${values.join(', ')}]. Does it reach the input?`, hint: 'One zero diagonal entry is enough to stop the whole serial path.' })),
  },
  {
    title: 'Restore the hidden layer',
    objective: 'Identify dead neurons without confusing them with small surviving gradients.',
    questions: [
      { values: [2.4, -1.2, .08], dead: [1] },
      { values: [-.1, 3.1, 0], dead: [0, 2] },
      { values: [1.2, .01, 4.4], dead: [] },
    ].map(({ values, dead }) => ({ kind: 'layer', values, dead, prompt: `Hidden pre-activations are [${values.join(', ')}]. Select every dead neuron.`, hint: 'Small positive is still open. ReLU blocks values at or below zero.' })),
  },
];
