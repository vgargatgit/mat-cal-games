import { el } from '../utils/dom.js';
export function LoadingScreen(title) { return el('div', { className: 'loading', role: 'status' }, el('span', { className: 'loading__mark' }, '∂'), el('p', {}, `Loading ${title}…`)); }
