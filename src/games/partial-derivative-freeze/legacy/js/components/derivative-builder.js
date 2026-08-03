import { el, button } from './dom.js';
import { collectVariables } from '../math/expression-model.js';

export function createDerivativeBuilder(round, initialValue = {}) {
  const wrapper = el('section', { className: 'lab-card protocol-card', 'aria-labelledby': 'builder-title' });
  wrapper.append(el('h2', { id: 'builder-title', text: round.taskKind === 'gradient' ? '5. Assemble the gradient' : round.taskKind === 'bug-hunter' ? '5. Repair the derivation' : '5. Build and simplify the derivative' }));

  if (round.taskKind === 'gradient') return createGradientBuilder(round, wrapper, initialValue);
  if (round.taskKind === 'bug-hunter') return createBugBuilder(round, wrapper, initialValue);

  wrapper.append(el('p', { className: 'derivative-instruction', text: 'Enter only the simplified expression on the right side of the derivative—not the original equation or an equals sign.' }));
  const input = el('input', { className: 'derivative-input', type: 'text', inputmode: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'Example answer: 2*x*y', 'aria-label': 'Final derivative expression' });
  input.value = initialValue.finalExpression || '';
  const palette = el('div', { className: 'token-palette', 'aria-label': 'Expression token palette' });
  const variables = [...collectVariables(round.expression).keys()];
  const tokens = [...new Set(['0', '1', '2', '3', ...variables, '+', '-', '*', '^', '(', ')', 'sin(', 'cos(', 'dy/dx'])];
  tokens.forEach((token) => palette.append(button(token, () => {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
    input.focus();
    input.setSelectionRange(start + token.length, start + token.length);
  }, { className: 'token-button' })));
  wrapper.append(input, palette, el('p', { className: 'microcopy', text: 'Use the token buttons or type the final derivative directly. Multiplication may be written as 2*x*y or 2xy.' }));
  return { element: wrapper, getValue: () => ({ finalExpression: input.value.trim() }) };
}

function createGradientBuilder(round, wrapper, initialValue) {
  const shapeNote = el('p', { text: `Fill components in numerator-layout order: ${round.expectedAnswer.componentOrder.join(', ')}.` });
  const inputs = [];
  const row = el('div', { className: 'gradient-builder', role: 'group', 'aria-label': 'Gradient component inputs' });
  round.expectedAnswer.componentOrder.forEach((name) => {
    const label = el('label', { className: 'gradient-slot' });
    label.append(el('span', { text: `∂f/∂${name}` }));
    const input = el('input', { type: 'text', placeholder: `component for ${name}`, 'aria-label': `Gradient component for ${name}` });
    input.value = initialValue.gradientComponents?.[inputs.length] || '';
    inputs.push(input);
    label.append(input);
    row.append(label);
  });
  wrapper.append(shapeNote, row);
  return { element: wrapper, getValue: () => ({ gradientComponents: inputs.map((input) => input.value.trim()) }) };
}

function createBugBuilder(round, wrapper, initialValue) {
  wrapper.append(el('p', { text: 'Select the first incorrect line, then enter the corrected derivative.' }));
  let selected = Number.isInteger(initialValue.firstIncorrectIndex) ? initialValue.firstIncorrectIndex : null;
  const steps = el('div', { className: 'bug-steps' });
  round.incorrectSteps.forEach((step, index) => {
    const buttonNode = el('button', { type: 'button', className: 'bug-step', onClick: () => {
      selected = index;
      [...steps.children].forEach((child) => child.classList.remove('selected'));
      buttonNode.classList.add('selected');
    } });
    buttonNode.append(el('span', { className: 'line-number', text: String(index + 1) }), el('span', { className: 'math', text: step.includes('\\') ? `\\[${step}\\]` : step }));
    if (selected === index) buttonNode.classList.add('selected');
    steps.append(buttonNode);
  });
  const correction = el('input', { className: 'derivative-input', type: 'text', placeholder: 'Correct derivative', 'aria-label': 'Corrected derivative' });
  correction.value = initialValue.finalExpression || '';
  wrapper.append(steps, correction);
  return { element: wrapper, getValue: () => ({ firstIncorrectIndex: selected, finalExpression: correction.value.trim() }) };
}
