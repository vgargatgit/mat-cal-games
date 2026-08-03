import { el } from './dom.js';
import { mathText } from '../math-renderer.js';

export function createDependencyScanner(round, initialValue = {}) {
  const wrapper = el('section', { className: 'lab-card protocol-card', 'aria-labelledby': 'scanner-title' });
  wrapper.append(el('h2', { id: 'scanner-title', text: '3. Scan term dependencies' }));
  wrapper.append(el('p', { text: `Which terms can change when ${round.activeVariable} changes? Inspect mixed terms at factor level.` }));
  const selections = {};
  const grid = el('div', { className: 'term-grid' });
  (round.expectedAnswer.termDependencies || []).forEach((term, index) => {
    const card = el('article', { className: 'term-card' });
    card.append(el('div', { className: 'math term-equation', text: mathText(term.latex, true) }));
    const choices = el('div', { className: 'segmented', role: 'group', 'aria-label': `Dependency classification for term ${index + 1}` });
    const changes = el('button', { type: 'button', text: 'Changes', onClick: () => select(index, true, changes, unchanged) });
    const unchanged = el('button', { type: 'button', text: 'No change', onClick: () => select(index, false, unchanged, changes) });
    choices.append(changes, unchanged);
    if (term.kind === 'mixed') card.append(el('span', { className: 'status-tag mixed', text: 'Contains active + frozen factors' }));
    card.append(choices);
    grid.append(card);
    if (Object.prototype.hasOwnProperty.call(initialValue || {}, index)) {
      const initial = Boolean(initialValue[index]);
      select(index, initial, initial ? changes : unchanged, initial ? unchanged : changes);
    }
  });
  function select(index, value, selectedButton, otherButton) {
    selections[index] = value;
    selectedButton.classList.add('selected');
    selectedButton.setAttribute('aria-pressed', 'true');
    otherButton.classList.remove('selected');
    otherButton.setAttribute('aria-pressed', 'false');
  }
  wrapper.append(grid);
  return { element: wrapper, getValue: () => ({ ...selections }) };
}
