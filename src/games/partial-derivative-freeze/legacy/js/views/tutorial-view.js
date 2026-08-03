import { el, button, clear } from '../components/dom.js';
import { mathText, renderMath } from '../math-renderer.js';
import { announce } from '../accessibility.js';

const STEPS = [
  { title: 'Select the moving variable', equation: 'f(x,y)=x^2+y,\\qquad \\frac{\\partial f}{\\partial x}', prompt: 'Which variable is allowed to change?', options: ['x', 'y'], correct: 'x', explanation: 'x appears in the denominator of the derivative notation, so x is active.' },
  { title: 'Freeze the other independent input', context: 'Derivative target: with respect to x', equation: 'f(x,y)=x^2+y,\\qquad \\frac{\\partial f}{\\partial x}', prompt: 'When differentiating with respect to x, which independent input is held fixed?', options: ['x', 'y'], correct: 'y', explanation: 'Because the derivative is with respect to x, x may change while the independent input y keeps one fixed value.' },
  { title: 'Identify changing terms', equation: 'x^2+y', prompt: 'Which term changes when x moves?', options: ['x²', 'y'], correct: 'x²', explanation: 'x² has a path from x. The independent term y has no such path.' },
  { title: 'Differentiate term by term', equation: '\\frac{\\partial}{\\partial x}(x^2+y)=\\frac{\\partial x^2}{\\partial x}+\\frac{\\partial y}{\\partial x}', prompt: 'Which rule separates these contributions?', options: ['Sum rule', 'Product rule'], correct: 'Sum rule', explanation: 'The sum rule lets each additive term be differentiated independently.' },
  { title: 'Apply local rules', equation: '\\frac{\\partial x^2}{\\partial x}+\\frac{\\partial y}{\\partial x}', prompt: 'Choose the unsimplified result.', options: ['2x+0', '2x+1'], correct: '2x+0', explanation: 'The power rule gives 2x, while independent y contributes zero.' },
  { title: 'Simplify without deleting frozen multipliers', equation: '\\frac{\\partial}{\\partial x}(x^2y+3y)', prompt: 'Which result preserves the frozen multiplier?', options: ['2xy', '2x'], correct: '2xy', explanation: 'Freeze variables, not mathematical reasoning. y remains as a multiplier in x²y, while the separate term 3y contributes zero.' }
];

export function tutorialView(actions) {
  const root = el('div', { className: 'tutorial-view shell-narrow' });
  let index = 0;
  const stage = el('div');
  root.append(el('div', { className: 'section-heading' }, [el('div', { className: 'eyebrow', text: 'Six-step cold-room orientation' }), el('h1', { text: 'Interactive tutorial' }), el('p', { text: 'Make one dependency decision at each step. The tutorial ends with the frozen-multiplier distinction.' })]), stage);

  async function render() {
    clear(stage);
    const step = STEPS[index];
    const card = el('section', { className: 'tutorial-card lab-card' });
    card.append(el('div', { className: 'tutorial-counter', text: `Step ${index + 1} of ${STEPS.length}` }), el('h2', { text: step.title }));
    if (step.context) card.append(el('div', { className: 'tutorial-context', text: step.context }));
    card.append(el('div', { className: 'math tutorial-equation', text: mathText(step.equation, true) }), el('p', { className: 'tutorial-prompt', text: step.prompt }));
    const options = el('div', { className: 'tutorial-options' });
    step.options.forEach((option) => options.append(button(option, () => choose(option, card), { className: 'button option-button' })));
    card.append(options);
    stage.append(card);
    await renderMath(card);
  }

  function choose(option, card) {
    const step = STEPS[index];
    const existing = card.querySelector('.tutorial-feedback');
    existing?.remove();
    const correct = option === step.correct;
    const feedback = el('div', { className: `tutorial-feedback ${correct ? 'correct' : 'incorrect'}`, role: 'status' });
    feedback.append(el('strong', { text: correct ? 'Correct dependency decision.' : 'Recheck which symbol is allowed to change.' }), el('p', { text: step.explanation }));
    if (correct) feedback.append(button(index === STEPS.length - 1 ? 'Enter the laboratory' : 'Next step', () => {
      if (index === STEPS.length - 1) actions.complete();
      else { index += 1; render(); }
    }, { className: 'button primary' }));
    card.append(feedback);
    announce(correct ? 'Correct. Continue to the next tutorial step.' : 'Not yet. Review the dependency explanation and try again.');
  }

  render();
  return root;
}
