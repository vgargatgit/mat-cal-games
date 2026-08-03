import { el } from './dom.js';
import { mathText } from '../math-renderer.js';
import { toLatex } from '../math/expression-model.js';

export function createFeedbackPanel(round, result) {
  const panel = el('section', { className: `feedback-panel ${result.correct ? 'correct' : 'incorrect'}`, role: 'status' });
  panel.append(el('h2', { text: result.feedback.title }));
  panel.append(el('p', { text: result.feedback.message }));
  if (result.feedback.details?.length) {
    const list = el('ol', { className: 'feedback-details' });
    result.feedback.details.forEach((detail) => list.append(el('li', { text: detail })));
    panel.append(list);
  }
  panel.append(el('div', { className: 'score-chip', text: `+${result.awarded ?? result.score} points` }));
  if (result.correct) {
    if (round.taskKind === 'gradient') panel.append(el('div', { className: 'math worked-answer', text: mathText(round.expectedAnswer.canonicalLatex || gradientLatex(round), true) }));
    else panel.append(el('div', { className: 'math worked-answer', text: mathText(`${round.derivativeRequest.latex}=${toLatex(round.expectedAnswer.derivativeAst)}`, true) }));
    if (round.connection) panel.append(el('p', { className: 'connection-note', text: round.connection }));
  } else {
    panel.append(el('p', { className: 'retry-note', text: 'Adjust the first inconsistent stage, then submit again. Hints remain available.' }));
  }
  return panel;
}

function gradientLatex(round) {
  return `\\frac{\\partial ${round.outputName}}{\\partial\\mathbf{x}}=\\begin{bmatrix}${round.expectedAnswer.components.map(toLatex).join(' & ')}\\end{bmatrix}`;
}
