import { el } from './dom.js';

export function createShapeCheck(round, initialValue = null) {
  const wrapper = el('fieldset', { className: 'lab-card protocol-card' });
  wrapper.append(el('legend', { text: '1. Confirm the derivative shape' }));
  const expectedGradient = round.taskKind === 'gradient';
  const options = [
    { value: 'scalar', label: 'Scalar (1×1)' },
    { value: 'row-vector', label: 'Row vector' },
    { value: 'vector', label: 'Column vector' },
    { value: 'matrix', label: 'Matrix' }
  ];
  const group = el('div', { className: 'choice-grid' });
  options.forEach((option) => {
    const label = el('label', { className: 'choice-card' });
    const input = el('input', { type: 'radio', name: 'shape', value: option.value });
    input.checked = option.value === initialValue;
    label.append(input, el('span', { text: option.label }));
    group.append(label);
  });
  wrapper.append(group, el('p', { className: 'microcopy', text: expectedGradient ? 'A scalar output differentiated by a vector input is a gradient row under numerator layout.' : 'Both the output and selected input are scalar in this round.' }));
  return { element: wrapper, getValue: () => wrapper.querySelector('input[name="shape"]:checked')?.value || null };
}
