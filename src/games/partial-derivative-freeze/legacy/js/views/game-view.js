import { el, button } from '../components/dom.js';
import { equationCard } from '../components/equation-card.js';
import { createShapeCheck } from '../components/shape-check.js';
import { createVariableFreezer } from '../components/variable-freezer.js';
import { createDependencyScanner } from '../components/dependency-scanner.js';
import { createRuleTray } from '../components/derivative-rule-tray.js';
import { createDerivativeBuilder } from '../components/derivative-builder.js';
import { createDependencyGraph } from '../components/dependency-graph.js';
import { createSensitivityDemo } from '../components/sensitivity-demo.js';
import { createFeedbackPanel } from '../components/feedback-panel.js';
import { LEVELS } from '../data/levels.js';
import { renderMath } from '../math-renderer.js';
import { announce } from '../accessibility.js';

export function gameView(round, state, actions) {
  const root = el('div', { className: 'game-layout' });
  const savedAnswer = state.learner.games.partialDerivativeFreeze.currentAnswer;
  const draft = savedAnswer?.roundId === round.id ? savedAnswer : {};
  const sidebar = levelSidebar(state, round.level, actions);
  const main = el('div', { className: 'game-main' });
  main.append(equationCard(round));

  const shape = createShapeCheck(round, draft.shape || null);
  main.append(shape.element);

  let freezer = null;
  let scanner = null;
  if (round.taskKind !== 'gradient') {
    freezer = createVariableFreezer(round, draft);
    scanner = createDependencyScanner(round, draft.termDependencies || {});
    main.append(freezer.element, createSensitivityDemo(round), scanner.element, createDependencyGraph(round));
  } else {
    main.append(el('section', { className: 'lab-card protocol-card' }, [el('h2', { text: '2–3. Repeat the freeze experiment for each component' }), el('p', { text: `Activate inputs in this order: ${round.expectedAnswer.componentOrder.join(' → ')}. Every completed scalar partial derivative fills one gradient slot.` })]));
  }

  const rules = createRuleTray(round, draft.selectedRules || []);
  const builder = createDerivativeBuilder(round, draft);
  main.append(rules.element, builder.element);

  const interpretation = el('label', { className: 'interpretation-check lab-card' });
  const interpretationInput = el('input', { type: 'checkbox' });
  interpretationInput.checked = draft.explanationChoice === 'correct';
  interpretation.append(interpretationInput, el('span', {}, [el('strong', { text: 'Plain-language interpretation' }), el('small', { text: 'A partial derivative moves one selected independent input while holding the others fixed; frozen multipliers can remain in changing terms.' })]));
  main.append(interpretation);

  const hintPanel = el('section', { className: 'hint-panel lab-card', hidden: true, role: 'status' });
  const feedbackHost = el('div');
  let hintsUsed = Number(draft.hintsUsed) || 0;
  let attemptNumber = Number(draft.attemptNumber) || 1;

  const controls = el('div', { className: 'game-controls' });
  const hintButton = button('Reveal next hint', () => {
    const hints = round.hints || [];
    if (!hints.length) return;
    const index = Math.min(hintsUsed, hints.length - 1);
    hintsUsed += 1;
    hintPanel.hidden = false;
    hintPanel.textContent = `Hint ${index + 1}: ${hints[index]}`;
    if (hintsUsed >= hints.length) hintButton.disabled = true;
    announce(hintPanel.textContent);
    actions.saveDraft(round, collectAnswer());
  }, { className: 'button ghost' });
  const submitButton = button('Validate the full reasoning chain', submit, { className: 'button primary large' });
  controls.append(hintButton, submitButton);
  main.append(hintPanel, controls, feedbackHost);
  root.append(sidebar, main);

  function collectAnswer() {
    const freezerValue = freezer?.getValue() || { activeVariable: round.activeVariable, frozenVariables: [] };
    return {
      shape: shape.getValue(),
      activeVariable: freezerValue.activeVariable,
      frozenVariables: freezerValue.frozenVariables,
      termDependencies: scanner?.getValue() || {},
      selectedRules: rules.getValue(),
      ...builder.getValue(),
      explanationChoice: interpretationInput.checked ? 'correct' : null,
      hintsUsed,
      attemptNumber
    };
  }

  async function submit() {
    const answer = collectAnswer();
    const result = actions.submit(round, answer);
    feedbackHost.replaceChildren(createFeedbackPanel(round, result));
    await renderMath(feedbackHost);
    announce(result.correct ? `Correct. ${result.feedback.message}` : `Not yet. ${result.feedback.message}`);
    if (result.correct) {
      submitButton.disabled = true;
      hintButton.disabled = true;
      const trace = el('section', { className: 'worked-trace lab-card' });
      trace.append(el('h2', { text: 'Worked dependency trace' }));
      const list = el('ol');
      (round.explanation || []).forEach((step) => list.append(el('li', { text: step })));
      trace.append(list, button('Generate the next round', () => actions.next(round.level), { className: 'button primary' }));
      feedbackHost.append(trace);
    } else {
      attemptNumber += 1;
      actions.saveDraft(round, collectAnswer());
    }
  }

  let draftTimer = null;
  const scheduleDraftSave = () => {
    if (submitButton.disabled) return;
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => actions.saveDraft(round, collectAnswer()), 250);
  };
  main.addEventListener('input', scheduleDraftSave);
  main.addEventListener('change', scheduleDraftSave);

  if (hintsUsed > 0 && round.hints?.length) {
    const index = Math.min(hintsUsed - 1, round.hints.length - 1);
    hintPanel.hidden = false;
    hintPanel.textContent = `Hint ${index + 1}: ${round.hints[index]}`;
    if (hintsUsed >= round.hints.length) hintButton.disabled = true;
  }

  if (draft.correct) {
    submitButton.disabled = true;
    hintButton.disabled = true;
    feedbackHost.append(el('section', { className: 'feedback-panel correct' }, [
      el('h2', { text: 'This round was already completed' }),
      el('p', { text: 'Your saved solution and progress were restored. Continue when ready.' }),
      button('Generate the next round', () => actions.next(round.level), { className: 'button primary' })
    ]));
  }

  return root;
}

function levelSidebar(state, currentLevel, actions) {
  const game = state.learner.games.partialDerivativeFreeze;
  const aside = el('aside', { className: 'level-sidebar', 'aria-label': 'Level selector' });
  aside.append(el('h2', { text: 'Cold-room levels' }));
  const list = el('div', { className: 'level-list' });
  LEVELS.forEach((level) => {
    const complete = game.progress.completedLevels.includes(level.id);
    const node = button(`${complete ? '✓ ' : ''}${level.id}. ${level.title}`, () => actions.chooseLevel(level.id), { className: `level-button ${level.id === Number(currentLevel) ? 'current' : ''}` });
    node.title = level.objective;
    list.append(node);
  });
  aside.append(list, el('p', { className: 'sidebar-note', text: 'Untimed by design. Hints reduce bonus points, never access to mastery.' }));
  return aside;
}
