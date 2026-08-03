import { el } from '../utils/dom.js';
export function Hint(text) { return el('aside', { className: 'hint', role: 'note' }, el('strong', {}, 'Hint'), el('p', {}, text)); }
