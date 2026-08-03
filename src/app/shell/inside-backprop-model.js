const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅'];

export const SANDBOX_ACTIVATIONS = Object.freeze({
  relu: Object.freeze({ label: 'ReLU', derivative: 1, jacobian: 'diag(z > 0 ? 1 : 0)' }),
  sigmoid: Object.freeze({ label: 'Sigmoid', derivative: .235, jacobian: 'diag(σ(z)(1−σ(z)))' }),
  tanh: Object.freeze({ label: 'Tanh', derivative: .786, jacobian: 'diag(1−tanh²(z))' }),
  linear: Object.freeze({ label: 'Linear', derivative: 1, jacobian: 'I' }),
});

export function createSandboxState({ depth = 3, activation = 'relu' } = {}) {
  const safeDepth = clampDepth(depth);
  const safeActivation = SANDBOX_ACTIVATIONS[activation] ? activation : 'relu';
  return {
    depth: safeDepth,
    activation: safeActivation,
    direction: 'idle',
    activeLayer: null,
    forwardStep: 0,
    composedJacobians: [],
    gradientHistory: [gradientEntry(0, null, 1)],
    animationPhase: 'idle',
  };
}

export function changeDepth(state, depth) {
  return createSandboxState({ depth, activation: state.activation });
}

export function changeActivation(state, activation) {
  return createSandboxState({ depth: state.depth, activation });
}

export function resetSandbox(state) {
  return createSandboxState({ depth: state.depth, activation: state.activation });
}

export function stepForward(state) {
  const previous = state.direction === 'forward' ? state.forwardStep : 0;
  const forwardStep = Math.min(state.depth + 1, previous + 1);
  return {
    ...state,
    direction: 'forward',
    activeLayer: forwardStep,
    forwardStep,
    composedJacobians: [],
    gradientHistory: [gradientEntry(0, null, 1)],
    animationPhase: 'settled',
  };
}

export function stepBackward(state) {
  const composed = state.direction === 'backward' ? state.composedJacobians : [];
  if (composed.length >= state.depth) return { ...state, animationPhase: 'settled' };

  const layer = state.depth - composed.length;
  const composedJacobians = [layer, ...composed];
  const magnitude = localFactor(state.activation) ** composedJacobians.length;
  const priorHistory = state.direction === 'backward' ? state.gradientHistory : [gradientEntry(0, null, 1)];

  return {
    ...state,
    direction: 'backward',
    activeLayer: layer,
    forwardStep: 0,
    composedJacobians,
    gradientHistory: [...priorHistory, gradientEntry(composedJacobians.length, layer, magnitude)],
    animationPhase: 'multiplying',
  };
}

export function activationConfig(state) {
  return SANDBOX_ACTIVATIONS[state.activation];
}

export function jacobianSymbol(layer) {
  return `J${SUBSCRIPTS[layer] ?? layer}ᵀ`;
}

export function expandedJacobian(state, layer = state.activeLayer) {
  if (!layer || layer > state.depth) return state.direction === 'forward' ? '∂L/∂output' : '—';
  const config = activationConfig(state);
  return state.direction === 'forward'
    ? `Layer ${layer}: z = Wa+b, a = φ(z)`
    : `${jacobianSymbol(layer)} = W${SUBSCRIPTS[layer] ?? layer}ᵀ · ${config.jacobian}`;
}

export function chainRuleExpression(state) {
  const terms = state.composedJacobians.map(jacobianSymbol);
  return [...terms, '∇output L'].join(' · ');
}

export function accessibleChainRuleExpression(state) {
  const terms = state.composedJacobians.map((layer) => `J ${layer} transpose`);
  return [...terms, 'output loss gradient'].join(' times ');
}

export function gradientBehavior(magnitude) {
  if (magnitude < .45) return 'Vanishing';
  if (magnitude > 1.6) return 'Growing';
  return 'Surviving';
}

export function localFactor(activation) {
  return 1.15 * SANDBOX_ACTIVATIONS[activation].derivative;
}

export function isBackwardComplete(state) {
  return state.composedJacobians.length === state.depth;
}

function gradientEntry(step, layer, magnitude) {
  return { step, layer, magnitude, behavior: gradientBehavior(magnitude) };
}

function clampDepth(depth) {
  return Math.max(1, Math.min(5, Number(depth) || 1));
}
