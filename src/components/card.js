import { el } from '../utils/dom.js';
export function Card(...children) { return el('section', { className: 'card' }, ...children); }
