import { el } from '../utils/dom.js';
import { accessibleChainRuleExpression, chainRuleExpression, gradientBehavior, isBackwardComplete, jacobianSymbol } from '../app/shell/inside-backprop-model.js';

/** Render the accumulated product of local Jacobians for the backpropagation sandbox. */
export function ChainRuleVisualizer(state) {
  const newestLayer = state.composedJacobians[0];
  const latest = state.gradientHistory.at(-1);
  const expression = chainRuleExpression(state);

  return el('section', { className: 'chain-rule-visualizer', 'aria-labelledby': 'chain-rule-heading' },
    el('div', { className: 'chain-rule-visualizer__heading' },
      el('div', {}, el('p', { className: 'eyebrow' }, 'Chain rule assembly'), el('h2', { id: 'chain-rule-heading' }, isBackwardComplete(state) ? 'Backward product complete' : state.direction === 'backward' ? 'Building the backward product' : 'Backward product ready')),
      el('span', { className: `gradient-status gradient-status--${latest.behavior.toLowerCase()}` }, gradientIcon(latest.behavior), ` ${latest.behavior}`)),
    el('div', {
      className: 'chain-rule-equation',
      role: 'img',
      'aria-label': `Current chain rule product: ${accessibleChainRuleExpression(state)}. Gradient magnitude ${latest.magnitude.toFixed(3)}, ${latest.behavior.toLowerCase()}.`,
    },
    ...state.composedJacobians.flatMap((layer, index) => [
      el('span', { className: `chain-token${layer === newestLayer && state.animationPhase === 'multiplying' ? ' chain-token--new' : ''}`, dataset: { layer: String(layer) } }, jacobianSymbol(layer)),
      el('span', { className: 'chain-operator', 'aria-hidden': 'true' }, '×'),
    ]),
    el('span', { className: 'chain-token chain-token--gradient' }, '∇output L')),
    el('p', { className: 'chain-rule-caption' }, state.composedJacobians.length
      ? `${jacobianSymbol(newestLayer)} multiplies the incoming gradient. The composed product is now ${expression}.`
      : 'Begin a backward step to multiply the output gradient by one local Jacobian at a time.'),
    el('ol', { className: 'gradient-history', 'aria-label': 'Gradient magnitude after each backward step' },
      ...state.gradientHistory.map((entry, index) => el('li', { className: index === state.gradientHistory.length - 1 ? 'gradient-history__current' : '' },
        el('span', {}, entry.layer ? `After ${jacobianSymbol(entry.layer)}` : 'Start'),
        el('strong', {}, entry.magnitude.toFixed(3)),
        el('span', { className: `gradient-behavior gradient-behavior--${entry.behavior.toLowerCase()}` }, gradientIcon(entry.behavior), ` ${entry.behavior}`)))));
}

function gradientIcon(behavior) {
  return { Vanishing: '↓', Growing: '↑', Surviving: '→' }[gradientBehaviorLabel(behavior)];
}

function gradientBehaviorLabel(value) {
  return ['Vanishing', 'Growing', 'Surviving'].includes(value) ? value : gradientBehavior(Number(value));
}
