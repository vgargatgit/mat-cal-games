export const BOSS_NETWORK = {
  input: [1, -2],
  w1: [[1, -1], [.5, .5], [-1, 2]],
  b1: [0, 1, .5],
  w2: [[1, -2, .5]],
  b2: [0],
  target: 1,
};

export function matrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

export function transpose(matrix) { return matrix[0].map((_, column) => matrix.map((row) => row[column])); }

export function forward(network = BOSS_NETWORK) {
  const z1 = matrixVector(network.w1, network.input).map((value, index) => value + network.b1[index]);
  const h = z1.map((value) => Math.max(0, value));
  const prediction = matrixVector(network.w2, h)[0] + network.b2[0];
  const loss = .5 * ((prediction - network.target) ** 2);
  return { z1, h, prediction, loss };
}

export function backward(network = BOSS_NETWORK) {
  const values = forward(network);
  const dPrediction = values.prediction - network.target;
  const dH = matrixVector(transpose(network.w2), [dPrediction]);
  const mask = values.z1.map((value) => value > 0 ? 1 : 0);
  const dZ1 = dH.map((value, index) => value * mask[index]);
  const dInput = matrixVector(transpose(network.w1), dZ1);
  const dW2 = [values.h.map((value) => dPrediction * value)];
  const dB2 = [dPrediction];
  const dW1 = dZ1.map((value) => network.input.map((input) => value * input));
  const dB1 = dZ1.slice();
  return { ...values, dPrediction, dH, mask, dZ1, dInput, dW2, dB2, dW1, dB1 };
}

export const TRANSFORMATIONS = [
  { id: 'loss-gradient', label: 'Loss derivative', symbol: 'ŷ − y', why: 'The loss supplies the first incoming gradient at the network output.' },
  { id: 'transpose-matmul', label: 'Transpose matrix multiply', symbol: 'Wᵀg', why: 'A column gradient moves backward through a linear map by multiplying with Wᵀ.' },
  { id: 'relu-mask', label: 'ReLU diagonal mask', symbol: 'diag(0,1) ⊙ g', why: 'The activation Jacobian keeps positive lanes and blocks non-positive lanes.' },
  { id: 'outer-product', label: 'Outer product', symbol: 'g · inputᵀ', why: 'Each weight gradient pairs one output gradient with the input that weight multiplied.' },
  { id: 'bias-reduction', label: 'Broadcast reduction', symbol: 'Σ lanes', why: 'A shared bias was broadcast forward, so its returning lane contributions add.' },
  { id: 'identity', label: 'Identity pass', symbol: 'g', why: 'An unshared scalar bias adds directly, so its local derivative is one.' },
  { id: 'gradient-update', label: 'Gradient update', symbol: 'θ − η∇θL', why: 'Training subtracts the scaled parameter gradient to seek lower loss.' },
];

export const BOSS_PHASES = [
  { title: 'Phase I · Break the loss shield', subtitle: 'Route the first crystal from loss to output.', edges: [{ id: 'loss-output', label: 'Loss → prediction', answer: 'loss-gradient', value: '∂L/∂ŷ = 1' }] },
  { title: 'Phase II · Cross the output layer', subtitle: 'Recover hidden gradients and the output weights.', edges: [
    { id: 'output-hidden', label: 'Prediction → hidden activations', answer: 'transpose-matmul', value: '∇hL = [1, −2, 0.5]' },
    { id: 'output-weights', label: 'Output weights', answer: 'outer-product', value: '∇W₂L = [3, 0.5, 0]' },
  ] },
  { title: 'Phase III · Open the activation gates', subtitle: 'Mask dead lanes, then continue through the first linear layer.', edges: [
    { id: 'relu-backward', label: 'Hidden h → pre-activation z', answer: 'relu-mask', value: '∇zL = [1, −2, 0]' },
    { id: 'hidden-input', label: 'Pre-activation → input', answer: 'transpose-matmul', value: '∇xL = [0, −2]' },
    { id: 'hidden-weights', label: 'First-layer weights', answer: 'outer-product', value: '∇W₁L = [[1,−2],[−2,4],[0,0]]' },
  ] },
  { title: 'Final Phase · Reconstruct backpropagation', subtitle: 'A new attack hides every local operation. No hints remain.', hard: true, edges: [
    { id: 'final-loss', label: 'Seed output gradient', answer: 'loss-gradient', value: '∂L/∂ŷ' },
    { id: 'final-w2-back', label: 'Back through W₂', answer: 'transpose-matmul', value: 'W₂ᵀ∂L/∂ŷ' },
    { id: 'final-relu', label: 'Back through ReLU', answer: 'relu-mask', value: 'diag(ReLU′(z))∇hL' },
    { id: 'final-w1-back', label: 'Back through W₁', answer: 'transpose-matmul', value: 'W₁ᵀ∇zL' },
    { id: 'final-dw2', label: 'Derive ∇W₂L', answer: 'outer-product', value: '∂L/∂ŷ · hᵀ' },
    { id: 'final-db2', label: 'Derive ∇b₂L', answer: 'identity', value: '∂L/∂ŷ' },
    { id: 'final-dw1', label: 'Derive ∇W₁L', answer: 'outer-product', value: '∇zL · xᵀ' },
    { id: 'final-db1', label: 'Derive shared bias gradient', answer: 'bias-reduction', value: 'Σ batch lanes' },
    { id: 'final-update', label: 'Repair the parameters', answer: 'gradient-update', value: 'θ ← θ − η∇θL' },
  ] },
];
