import { el } from '../utils/dom.js';
export function Modal({ title, content, actions = [] }) {
  const dialog = el('dialog', { className: 'modal' },
    el('div', { className: 'modal__panel' },
      el('div', { className: 'modal__header' }, el('h2', {}, title), el('button', { type: 'button', className: 'icon-button', 'aria-label': 'Close dialog', onclick: () => dialog.close() }, '×')),
      el('div', { className: 'modal__content' }, content),
      actions.length ? el('div', { className: 'modal__actions' }, ...actions) : null));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.body.append(dialog); dialog.showModal();
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  return dialog;
}
