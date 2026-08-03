import { el } from './dom.js';

export function progressBar(value, label = 'Mastery') {
  const wrapper = el('div', { className: 'progress-widget' });
  wrapper.append(el('div', { className: 'progress-label' }, [el('span', { text: label }), el('strong', { text: `${Math.round(value)}%` })]));
  const bar = el('div', { className: 'progress-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(value)), 'aria-label': label });
  bar.append(el('span', { style: `width:${Math.max(0, Math.min(100, value))}%` }));
  wrapper.append(bar);
  return wrapper;
}
