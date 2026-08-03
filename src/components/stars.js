import { el } from '../utils/dom.js';
export function Stars(count = 0, label = `${count} of 3 stars`) {
  return el('span', { className: 'stars', role: 'img', 'aria-label': label },
    ...[1, 2, 3].map((value) => el('span', { className: value <= count ? 'star earned' : 'star' }, value <= count ? '★' : '☆')));
}
