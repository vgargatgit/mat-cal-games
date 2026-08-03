import { el } from './dom.js';
import { DERIVATIVE_RULES } from '../data/derivative-rules.js';

export function createRuleTray(round, initialValue = []) {
  const wrapper = el('fieldset', { className: 'lab-card protocol-card' });
  wrapper.append(el('legend', { text: '4. Place derivative rules' }));
  const tray = el('div', { className: 'rule-tray' });
  const relevant = DERIVATIVE_RULES.filter((rule) => new Set([...(round.rules || []), 'constant', 'product', 'chain']).has(rule.id));
  relevant.forEach((rule) => {
    const label = el('label', { className: 'rule-card' });
    const input = el('input', { type: 'checkbox', name: 'rule', value: rule.id });
    input.checked = initialValue.includes(rule.id);
    label.append(input, el('span', {}, [el('strong', { text: rule.label }), el('small', { text: rule.short })]));
    label.title = rule.description;
    tray.append(label);
  });
  wrapper.append(tray, el('p', { className: 'microcopy', text: 'Choose every rule that is essential to your reasoning. Extra complexity is allowed, but the key rules must be present.' }));
  return { element: wrapper, getValue: () => [...wrapper.querySelectorAll('input[name="rule"]:checked')].map((input) => input.value) };
}
