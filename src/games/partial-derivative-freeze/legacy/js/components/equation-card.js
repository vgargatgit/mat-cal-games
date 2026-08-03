import { el } from './dom.js';
import { mathText } from '../math-renderer.js';
import { toLatex } from '../math/expression-model.js';

export function equationCard(round) {
  const card = el('section', { className: 'equation-card lab-card', 'aria-labelledby': 'equation-title' });
  card.append(el('div', { className: 'eyebrow', text: `Level ${round.level} · ${round.difficulty || 'guided'}` }));
  card.append(el('h1', { id: 'equation-title', text: round.title }));
  if (round.displayDefinitions?.length) {
    const definitions = el('div', { className: 'definition-strip' });
    round.displayDefinitions.forEach((definition) => definitions.append(el('div', { className: 'math display-math', text: mathText(definition, true) })));
    card.append(definitions);
  }
  const outputName = round.outputName || 'f';
  const outputAlreadyDefined = (round.displayDefinitions || []).some((definition) => {
    const text = String(definition).replace(/\s+/g, '');
    return text.includes(`${outputName}=`) || text.includes(`${outputName}(`);
  });
  if (!outputAlreadyDefined) card.append(el('div', { className: 'math hero-equation', text: mathText(`${outputName}=${toLatex(round.expression)}`, true) }));
  card.append(el('p', { className: 'request-label', text: 'Find' }));
  card.append(el('div', { className: 'math derivative-request', text: mathText(round.derivativeRequest.latex, true), role: 'img', 'aria-label': `Derivative of ${round.outputName || 'f'} with respect to ${round.activeVariable || 'the input vector'}` }));
  return card;
}
