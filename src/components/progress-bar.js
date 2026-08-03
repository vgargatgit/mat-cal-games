import { el } from '../utils/dom.js';
export function ProgressBar(value, label = 'Progress') {
  const safe = Math.max(0, Math.min(100, value));
  return el('div', { className: 'progress-bar', role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(safe) },
    el('span', { style: `width:${safe}%` }));
}
