import { el } from '../utils/dom.js';
export class Toast {
  constructor(host) { this.node = el('div', { className: 'toast', role: 'status', 'aria-live': 'polite' }); host.append(this.node); }
  show(message, tone = 'info') {
    this.node.textContent = message; this.node.dataset.tone = tone; this.node.classList.add('toast--visible');
    clearTimeout(this.timer); this.timer = setTimeout(() => this.node.classList.remove('toast--visible'), 3200);
  }
  destroy() { clearTimeout(this.timer); this.node.remove(); }
}
