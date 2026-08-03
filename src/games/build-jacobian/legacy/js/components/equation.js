import { h } from './dom.js';
import { latexToReadableText } from '../math-renderer.js';

export function equation(latex, options = {}) {
  const display = Boolean(options.block);
  return h(display ? 'div' : 'span', {
    className: `math-line${options.className ? ` ${options.className}` : ''}`,
    text: latexToReadableText(latex),
    dataset: {
      latex,
      display: String(display),
      mathRendered: 'false',
    },
    'aria-label': options.label || latexToReadableText(latex),
  });
}
