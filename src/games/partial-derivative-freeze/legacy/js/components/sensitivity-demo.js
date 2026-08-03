import { el } from './dom.js';
import { evaluateExpression, toPlain } from '../math/expression-model.js';

export function createSensitivityDemo(round) {
  const wrapper = el('section', { className: 'lab-card sensitivity-card', 'aria-labelledby': 'sensitivity-title' });
  wrapper.append(el('h2', { id: 'sensitivity-title', text: 'Sensitivity chamber' }));
  const env = {};
  round.variables.forEach((item, index) => { env[item.name] = item.name === round.activeVariable ? 1 : index + 2; });
  const active = round.activeVariable;
  if (!active || round.variables.some((item) => item.role === 'dependent')) {
    wrapper.append(el('p', { text: 'This chamber is disabled because the round includes a declared functional dependency.' }));
    return wrapper;
  }
  const label = el('label', { className: 'slider-label' });
  const valueText = el('strong', { text: String(env[active]) });
  label.append(el('span', { text: `Move ${active}: ` }), valueText);
  const slider = el('input', { type: 'range', min: '-2', max: '3', step: '0.25', value: String(env[active]), 'aria-label': `Move active variable ${active}` });
  const output = el('output', { className: 'sensitivity-output' });
  const frozenText = round.variables.filter((item) => item.name !== active).map((item) => `${item.name}=${env[item.name]}`).join(', ');
  const update = () => {
    env[active] = Number(slider.value);
    valueText.textContent = slider.value;
    let result;
    try { result = evaluateExpression(round.expression, env); } catch { result = NaN; }
    output.textContent = `${toPlain(round.expression)} = ${Number.isFinite(result) ? Number(result.toFixed(4)) : 'undefined'}`;
  };
  slider.addEventListener('input', update);
  update();
  wrapper.append(label, slider, el('p', { className: 'frozen-readout', text: frozenText ? `Frozen values: ${frozenText}` : 'No other inputs in this round.' }), output, el('p', { className: 'microcopy', text: 'The active variable moves. Frozen values remain stationary, yet they can still scale how much the expression changes.' }));
  return wrapper;
}
