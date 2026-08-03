import { el } from '../utils/dom.js';

export function Button(label, { kind = 'secondary', icon = '', ...attributes } = {}) {
  return el('button', { type: 'button', className: `button button--${kind}`, ...attributes },
    icon ? el('span', { 'aria-hidden': 'true' }, icon) : null,
    el('span', {}, label));
}
