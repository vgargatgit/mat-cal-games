import { Button } from '../../components/button.js';
import { el } from '../../utils/dom.js';

const ACTIVATIONS = {
  relu: { label: 'ReLU', derivative: 1, jacobian: 'diag(z > 0 ? 1 : 0)' },
  sigmoid: { label: 'Sigmoid', derivative: .235, jacobian: 'diag(σ(z)(1−σ(z)))' },
  tanh: { label: 'Tanh', derivative: .786, jacobian: 'diag(1−tanh²(z))' },
  linear: { label: 'Linear', derivative: 1, jacobian: 'I' },
};

export function InsideBackprop(onBack) {
  let depth = 3;
  let activation = 'relu';
  let direction = 'idle';
  let step = 0;
  const root = el('section', { className: 'page backprop-sandbox' });

  function render() {
    const config = ACTIVATIONS[activation];
    root.replaceChildren(
      el('header', { className: 'page-heading' }, el('p', { className: 'eyebrow' }, 'Unlocked laboratory'), el('h1', {}, 'Inside Backpropagation'), el('p', {}, 'Step through a deeper network and watch the chain rule become a product of local Jacobians.')),
      el('div', { className: 'sandbox-controls' },
        el('label', {}, el('span', {}, `Network depth: ${depth} layers`), el('input', { type: 'range', min: '1', max: '5', value: String(depth), oninput: (event) => { depth = Number(event.target.value); step = 0; direction = 'idle'; render(); } })),
        el('label', {}, el('span', {}, 'Activation'), el('select', { onchange: (event) => { activation = event.target.value; step = 0; direction = 'idle'; render(); } }, ...Object.entries(ACTIVATIONS).map(([value, item]) => el('option', { value, selected: value === activation }, item.label)))),
        el('div', { className: 'button-row button-row--left' }, Button('Step forward', { kind: direction !== 'backward' ? 'primary' : 'secondary', onclick: stepForward }), Button('Step backward', { kind: direction === 'backward' ? 'primary' : 'secondary', onclick: stepBackward }), Button('Reset', { onclick: () => { direction = 'idle'; step = 0; render(); } }))),
      el('section', { className: 'sandbox-network', 'aria-label': `${depth} layer network with ${config.label} activations` }, ...networkLayers(config)),
      el('div', { className: 'sandbox-readout' },
        el('article', { className: 'card' }, el('p', { className: 'eyebrow' }, 'Active local Jacobian'), el('h2', {}, activeLabel()), el('code', {}, activeJacobian(config))),
        el('article', { className: 'card' }, el('p', { className: 'eyebrow' }, 'Gradient behavior'), el('h2', {}, gradientState(config)), el('p', {}, gradientExplanation(config)))),
      el('p', { className: 'sandbox-equation' }, '∇input L = J₁ᵀ J₂ᵀ ··· Jₖᵀ ∇output L'),
      Button('Return to mastery', { kind: 'primary', onclick: onBack }));
  }

  function networkLayers(config) {
    const layers = [el('div', { className: `sandbox-layer ${isActive(0) ? 'sandbox-layer--active' : ''}` }, el('strong', {}, 'Input'), el('span', {}, 'x'))];
    for (let index = 1; index <= depth; index += 1) {
      layers.push(el('div', { className: `sandbox-jacobian ${isActive(index) ? 'sandbox-jacobian--active' : ''}` }, el('i', {}), el('small', {}, direction === 'backward' ? 'Jᵀ' : 'W')),
        el('div', { className: `sandbox-layer ${isActive(index) ? 'sandbox-layer--active' : ''}` }, el('strong', {}, `Layer ${index}`), el('span', {}, config.label)));
    }
    layers.push(el('div', { className: `sandbox-jacobian ${isActive(depth + 1) ? 'sandbox-jacobian--active' : ''}` }, el('i', {}), el('small', {}, 'loss')), el('div', { className: 'sandbox-layer' }, el('strong', {}, 'Loss'), el('span', {}, 'L')));
    return layers;
  }

  function stepForward() { const continuing = direction === 'forward'; direction = 'forward'; step = Math.min(depth + 1, continuing ? step + 1 : 1); render(); }
  function stepBackward() { if (direction !== 'backward') { direction = 'backward'; step = depth + 1; } else step = Math.max(0, step - 1); render(); }
  function isActive(index) { return direction !== 'idle' && step === index; }
  function activeLabel() { if (direction === 'idle') return 'Choose a direction'; if (step === depth + 1) return 'Loss derivative'; if (step === 0) return 'Input gradient assembled'; return direction === 'forward' ? `Layer ${step} forward map` : `Layer ${step} transpose and activation`; }
  function activeJacobian(config) { if (direction === 'idle') return '—'; if (step === depth + 1) return '∂L/∂output'; if (step === 0) return 'J₁ᵀ ··· Jₖᵀ ∇L'; return direction === 'forward' ? 'z = Wa+b, a = φ(z)' : `Wᵀ · ${config.jacobian}`; }
  function gradientMagnitude(config) { return (1.15 * config.derivative) ** depth; }
  function gradientState(config) { const magnitude = gradientMagnitude(config); return magnitude < .45 ? 'Vanishing' : magnitude > 1.6 ? 'Growing' : 'Surviving'; }
  function gradientExplanation(config) { const magnitude = gradientMagnitude(config); return `With ${depth} ${config.label} layer${depth === 1 ? '' : 's'}, this illustrative local product has magnitude ${magnitude.toFixed(3)}. Each backward step multiplies one more local Jacobian.`; }

  render();
  return root;
}
