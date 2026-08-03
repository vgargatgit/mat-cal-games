import { el } from '../utils/dom.js';
export function Confetti(host) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = el('div', { className: 'confetti', 'aria-hidden': 'true' },
    ...Array.from({ length: 24 }, (_, index) => el('i', { style: `--i:${index};--x:${(index * 37) % 100}%` })));
  host.append(layer); setTimeout(() => layer.remove(), 1800);
}
