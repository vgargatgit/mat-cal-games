import { Button } from './button.js';
import { Stars } from './stars.js';
import { el } from '../utils/dom.js';

export function ResultScreen(game, result, { onContinue, onMap }) {
  return el('section', { className: 'result-screen', 'aria-labelledby': 'result-title' },
    el('p', { className: 'eyebrow' }, 'Module complete'),
    el('h1', { id: 'result-title' }, `${game.title} cleared`),
    Stars(result.stars),
    el('div', { className: 'result-grid' },
      resultBlock('What you learned', game.learned),
      resultBlock('Concepts reinforced', game.concepts.join(' · ')),
      resultBlock('Common mistakes', game.mistakes),
      resultBlock('Next concept', game.nextConcept)),
    el('div', { className: 'button-row' },
      Button('World map', { onclick: onMap }),
      Button(game.order === '08' ? 'View mastery' : 'Continue', { kind: 'primary', onclick: onContinue })));
}

function resultBlock(title, copy) { return el('article', { className: 'card' }, el('h2', {}, title), el('p', {}, copy)); }
