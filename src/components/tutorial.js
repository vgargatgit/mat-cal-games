import { Button } from './button.js';
import { Modal } from './modal.js';
import { el } from '../utils/dom.js';

/** Present a short, keyboard-accessible walkthrough using the shared modal. */
export function Tutorial({ title, steps, onComplete = () => {} }) {
  let index = 0;
  const content = el('div', { className: 'tutorial' });
  const back = Button('Back', { onclick: () => { if (index > 0) { index -= 1; render(); } } });
  const next = Button('Next', { kind: 'primary', onclick: () => {
    if (index < steps.length - 1) { index += 1; render(); }
    else { onComplete(); dialog.close(); }
  } });
  const dialog = Modal({ title, content, actions: [back, next] });

  function render() {
    const step = steps[index];
    back.disabled = index === 0;
    next.querySelector('span:last-child').textContent = index === steps.length - 1 ? 'Start playing' : 'Next';
    content.replaceChildren(
      el('div', { className: 'tutorial__progress', 'aria-label': `Tutorial step ${index + 1} of ${steps.length}` },
        el('strong', {}, `Step ${index + 1} of ${steps.length}`),
        el('span', { 'aria-hidden': 'true' }, ...steps.map((_, dot) => el('i', { className: dot <= index ? 'tutorial__dot tutorial__dot--active' : 'tutorial__dot' })))),
      el('section', { className: 'tutorial__step' },
        el('span', { className: 'tutorial__icon', 'aria-hidden': 'true' }, step.icon ?? '∂'),
        el('div', {}, el('h3', {}, step.title), renderContent(step))));
  }

  render();
  return dialog;
}

function renderContent(step) {
  if (typeof step.content === 'function') return step.content();
  if (typeof step.content === 'string') return el('p', {}, step.content);
  return el('div', {},
    ...(step.paragraphs ?? []).map((paragraph) => el('p', {}, paragraph)),
    step.rules?.length ? el('div', { className: 'tutorial-rules' }, ...step.rules.map((item) => el('div', { className: `tutorial-rule tutorial-rule--${item.kind ?? 'pass'}` },
      el('strong', {}, item.condition), el('span', {}, item.derivative), el('b', {}, item.action)))) : null,
    step.bullets?.length ? el('ul', { className: 'tutorial__list' }, ...step.bullets.map((item) => el('li', {}, item))) : null,
    step.callout ? el('p', { className: 'tutorial__callout' }, step.callout) : null);
}
