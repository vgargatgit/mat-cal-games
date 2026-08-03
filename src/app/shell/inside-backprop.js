import { Button } from '../../components/button.js';
import { ChainRuleVisualizer } from '../../components/chain-rule-visualizer.js';
import { el } from '../../utils/dom.js';
import {
  SANDBOX_ACTIVATIONS,
  activationConfig,
  changeActivation,
  changeDepth,
  createSandboxState,
  expandedJacobian,
  isBackwardComplete,
  jacobianSymbol,
  resetSandbox,
  stepBackward,
  stepForward,
} from './inside-backprop-model.js';

export function InsideBackprop(onBack) {
  let state = createSandboxState();
  let lastAnnouncement = 'Sandbox ready. Choose a direction.';
  const root = el('section', { className: 'page backprop-sandbox' });

  function render(focusAction = '') {
    const config = activationConfig(state);
    root.replaceChildren(
      el('header', { className: 'page-heading' },
        el('p', { className: 'eyebrow' }, 'Unlocked laboratory'),
        el('h1', {}, 'Inside Backpropagation'),
        el('p', {}, 'Step through a deeper network and watch the chain rule become a product of local Jacobians.')),
      controls(config),
      el('section', { className: 'sandbox-network', 'aria-label': `${state.depth} layer network with ${config.label} activations` }, ...networkLayers(config)),
      el('div', { className: 'sandbox-readout' },
        el('article', { className: 'card' },
          el('p', { className: 'eyebrow' }, 'Active local Jacobian'),
          el('h2', {}, activeLabel()),
          el('code', {}, expandedJacobian(state))),
        el('article', { className: 'card' },
          el('p', { className: 'eyebrow' }, 'Current operation'),
          el('h2', {}, operationLabel()),
          el('p', {}, operationExplanation(config)))),
      ChainRuleVisualizer(state),
      el('p', { className: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' }, lastAnnouncement),
      Button('Return to mastery', { kind: 'primary', onclick: onBack }));

    if (focusAction) requestAnimationFrame(() => root.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true }));
  }

  function controls(config) {
    return el('div', { className: 'sandbox-controls' },
      el('label', { for: 'sandbox-depth' },
        el('span', {}, `Network depth: ${state.depth} layer${state.depth === 1 ? '' : 's'}`),
        el('input', {
          id: 'sandbox-depth', type: 'range', min: '1', max: '5', value: String(state.depth),
          oninput: (event) => {
            state = changeDepth(state, event.target.value);
            lastAnnouncement = `Network reset to ${state.depth} layers.`;
            render();
          },
        })),
      el('label', { for: 'sandbox-activation' },
        el('span', {}, 'Activation'),
        el('select', {
          id: 'sandbox-activation',
          onchange: (event) => {
            state = changeActivation(state, event.target.value);
            lastAnnouncement = `Network reset with ${activationConfig(state).label} activations.`;
            render();
          },
        }, ...Object.entries(SANDBOX_ACTIVATIONS).map(([value, item]) => el('option', { value, selected: value === state.activation }, item.label)))),
      el('div', { className: 'button-row button-row--left' },
        Button('Step forward', { kind: state.direction !== 'backward' ? 'primary' : 'secondary', dataset: { action: 'forward' }, onclick: handleForward }),
        Button(isBackwardComplete(state) ? 'Input gradient reached' : 'Step backward', {
          kind: state.direction === 'backward' ? 'primary' : 'secondary',
          dataset: { action: 'backward' },
          disabled: isBackwardComplete(state),
          'aria-label': isBackwardComplete(state) ? 'Backward pass complete; input gradient assembled' : 'Step backward through one local Jacobian',
          onclick: handleBackward,
        }),
        Button('Reset', { dataset: { action: 'reset' }, onclick: handleReset })),
      el('p', { className: 'sandbox-controls__hint' }, `Each backward step multiplies by one ${config.label} local Jacobian.`));
  }

  function networkLayers(config) {
    const inputComplete = isBackwardComplete(state);
    const layers = [el('div', { className: `sandbox-layer${inputComplete ? ' sandbox-layer--complete' : ''}` },
      el('strong', {}, 'Input'), el('span', {}, inputComplete ? '∇x L assembled' : 'x'))];

    for (let index = 1; index <= state.depth; index += 1) {
      const active = state.activeLayer === index;
      const complete = state.composedJacobians.includes(index);
      layers.push(
        el('div', {
          className: `sandbox-jacobian${active ? ' sandbox-jacobian--active' : ''}${complete ? ' sandbox-jacobian--complete' : ''}`,
          'aria-label': `${jacobianSymbol(index)}${active ? ', active' : ''}${complete ? ', included in product' : ''}`,
        },
        el('i', {}),
        active && state.direction === 'backward' ? el('b', { className: 'sandbox-gradient-particle', 'aria-hidden': 'true' }, '◆') : null,
        el('small', {}, state.direction === 'backward' ? jacobianSymbol(index) : 'W')),
        el('div', { className: `sandbox-layer${active ? ' sandbox-layer--active' : ''}${complete ? ' sandbox-layer--complete' : ''}` },
          el('strong', {}, `Layer ${index}`), el('span', {}, config.label)));
    }

    const lossActive = state.direction === 'forward' && state.forwardStep === state.depth + 1;
    layers.push(
      el('div', { className: `sandbox-jacobian${lossActive ? ' sandbox-jacobian--active' : ''}` }, el('i', {}), el('small', {}, 'loss')),
      el('div', { className: `sandbox-layer${lossActive ? ' sandbox-layer--active' : ''}` }, el('strong', {}, 'Loss'), el('span', {}, '∇output L')));
    return layers;
  }

  function handleForward() {
    state = stepForward(state);
    lastAnnouncement = state.forwardStep === state.depth + 1
      ? 'Forward pass reached the loss.'
      : `Forward pass reached layer ${state.forwardStep}.`;
    render('forward');
  }

  function handleBackward() {
    state = stepBackward(state);
    const latest = state.gradientHistory.at(-1);
    lastAnnouncement = `Layer ${state.activeLayer} Jacobian added to the backward product. Gradient magnitude ${latest.magnitude.toFixed(3)}. ${latest.behavior}.`;
    render('backward');
  }

  function handleReset() {
    state = resetSandbox(state);
    lastAnnouncement = 'Sandbox reset.';
    render('reset');
  }

  function activeLabel() {
    if (state.direction === 'idle') return 'Choose a direction';
    if (state.direction === 'forward' && state.forwardStep === state.depth + 1) return 'Loss derivative';
    if (state.direction === 'forward') return `Layer ${state.forwardStep} forward map`;
    return `Layer ${state.activeLayer} backward map`;
  }

  function operationLabel() {
    if (state.direction === 'idle') return 'Ready to explore';
    if (state.direction === 'forward') return state.forwardStep === state.depth + 1 ? 'Measure the loss' : 'Values move forward';
    return isBackwardComplete(state) ? 'Input gradient assembled' : 'Compose one more Jacobian';
  }

  function operationExplanation(config) {
    if (state.direction === 'idle') return 'Forward steps reveal value flow. Backward steps construct the chain-rule product.';
    if (state.direction === 'forward') return 'The layer applies its linear map and activation before passing values onward.';
    return `${jacobianSymbol(state.activeLayer)} routes the incoming gradient through the layer’s transpose and ${config.label} derivative.`;
  }

  render();
  return root;
}
