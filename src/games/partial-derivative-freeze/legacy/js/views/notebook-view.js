import { el, button } from '../components/dom.js';
import { CONCEPTS } from '../data/concepts.js';
import { mathText } from '../math-renderer.js';

export function notebookView(actions) {
  const root = el('div', { className: 'notebook-view shell-wide' });
  root.append(el('div', { className: 'section-heading' }, [el('div', { className: 'eyebrow', text: 'Concept notebook' }), el('h1', { text: 'Dependency-first derivative reference' }), el('p', { text: 'Each entry preserves the same numerator-layout and dependency assumptions used by the game.' })]));
  const grid = el('div', { className: 'notebook-grid' });
  CONCEPTS.forEach((concept) => {
    const card = el('article', { className: 'notebook-card lab-card' });
    card.append(el('h2', { text: concept.title }), el('div', { className: 'math notebook-equation', text: mathText(concept.latex, true) }), el('p', { text: concept.definition }), el('h3', { text: 'Worked example' }), el('div', { className: 'math', text: mathText(concept.example, true) }), el('div', { className: 'misconception-note' }, [el('strong', { text: 'Common trap: ' }), el('span', { text: concept.misconception })]), el('p', { className: 'level-links', text: `Practise in levels ${concept.levels.join(', ')}.` }));
    grid.append(card);
  });
  root.append(grid, button('Return to laboratory', () => actions.navigate('game'), { className: 'button primary' }));
  return root;
}
