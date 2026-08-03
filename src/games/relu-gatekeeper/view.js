import { Button } from '../../components/button.js';
import { el } from '../../utils/dom.js';
import { GATE_STAGES, chainGradient, deadNeuronIndices, relu, reluDerivative } from './engine.js';
import { announce, createTrainingStore, scoreStars } from '../training-runtime.js';

const DEFAULTS = { schemaVersion: 1, stage: 0, question: 0, completedStages: [], score: 0, attempts: 0, hints: 0 };

export function createReLUGatekeeper(container, context, metadata) {
  const store = createTrainingStore(metadata.storageKey, DEFAULTS);
  let state = store.load();
  let selected = new Set();
  let feedback = null;
  let paused = false;
  const timers = new Set();
  const root = el('section', { className: 'training-game gatekeeper', 'aria-label': 'ReLU Gatekeeper' });
  container.replaceChildren(root);

  function persist() { store.save(state); context.onProgress?.({ completed: state.completedStages.length, total: GATE_STAGES.length, score: state.score }); }

  function render() {
    const stage = GATE_STAGES[state.stage] ?? GATE_STAGES[0];
    const question = stage.questions[state.question] ?? stage.questions[0];
    root.replaceChildren(
      el('div', { className: 'training-game__backdrop gatekeeper__backdrop', 'aria-hidden': 'true' }),
      el('header', { className: 'training-intro' }, el('p', { className: 'eyebrow' }, `Chapter III · Trial ${state.stage + 1} of ${GATE_STAGES.length}`), el('h1', {}, stage.title), el('p', {}, stage.objective)),
      el('div', { className: 'training-status' }, stat('Gate', `${state.question + 1}/${stage.questions.length}`), stat('Score', state.score), stat('Rule', 'diag(0 or 1)')),
      el('main', { className: 'gate-workspace' },
        el('section', { className: 'gate-scene' }, renderScene(question)),
        el('section', { className: 'training-panel gate-question' },
          el('p', { className: 'eyebrow' }, question.kind === 'layer' ? 'Hidden-layer scan' : 'Incoming signal'),
          el('h2', {}, question.prompt),
          renderControls(question),
          feedback ? el('div', { className: `training-feedback training-feedback--${feedback.correct ? 'correct' : 'wrong'}`, role: 'status' }, el('strong', {}, feedback.title), el('p', {}, feedback.copy), feedback.correct ? Button(isLastQuestion(stage) ? (state.stage === 3 ? 'Finish restoration' : 'Next trial') : 'Next gate', { kind: 'primary', onclick: advance }) : null) : null,
          el('div', { className: 'training-hint', hidden: 'true', 'data-hint': '' }, question.hint))),
      el('div', { className: 'sr-only', 'aria-live': 'assertive', 'data-training-live': '' }));
  }

  function renderScene(question) {
    if (question.kind === 'chain') {
      return el('div', { className: 'gate-chain', 'aria-label': `ReLU chain with values ${question.values.join(', ')}` },
        el('span', { className: 'gradient-crystal' }, '∇'),
        ...question.values.slice().reverse().flatMap((value, index) => [gate(value, index), index < question.values.length - 1 ? el('i', { className: 'gate-wire', 'aria-hidden': 'true' }) : null]));
    }
    if (question.kind === 'layer') {
      return el('div', { className: 'hidden-layer' }, ...question.values.map((value, index) => el('div', { className: `neuron ${selected.has(index) ? 'neuron--selected' : ''}` }, el('span', {}, `h${index + 1}`), el('strong', {}, value), el('small', {}, `ReLU=${relu(value)}`))));
    }
    return el('div', { className: 'single-gate' }, el('span', { className: 'gradient-crystal' }, '∇'), el('i', { className: 'gate-wire' }), gate(question.value, 0), el('i', { className: 'gate-wire' }), el('span', { className: 'gate-destination' }, 'earlier layer'));
  }

  function gate(value, index) {
    return el('div', { className: 'relu-gate', dataset: { gate: String(index), state: 'waiting' } }, el('span', {}, 'ReLU'), el('strong', {}, `z=${value}`), el('small', {}, 'local J = ?'));
  }

  function renderControls(question) {
    if (question.kind === 'layer') {
      return el('div', {}, el('div', { className: 'neuron-selectors' }, ...question.values.map((value, index) => Button(`Neuron ${index + 1}`, { 'aria-pressed': String(selected.has(index)), onclick: () => { selected.has(index) ? selected.delete(index) : selected.add(index); feedback = null; render(); } }))), Button('Check dead neurons', { kind: 'primary', onclick: () => answerLayer(question) }));
    }
    const pass = question.kind === 'chain' ? 'Gradient reaches input' : 'Pass gradient · derivative 1';
    const block = question.kind === 'chain' ? 'Gradient is blocked' : 'Block gradient · derivative 0';
    return el('div', { className: 'choice-grid' }, Button(pass, { kind: 'primary', onclick: () => answer(question, true) }), Button(block, { onclick: () => answer(question, false) }));
  }

  function answer(question, chosePass) {
    if (paused || feedback?.correct) return;
    state.attempts += 1;
    const correctPass = question.kind === 'chain' ? chainGradient(question.values) !== 0 : reluDerivative(question.value) === 1;
    const correct = chosePass === correctPass;
    if (correct) state.score += feedback ? 60 : 100;
    const copy = explain(question, correctPass, chosePass);
    feedback = { correct, title: correct ? (correctPass ? 'Gate open' : 'Gradient stopped') : 'Inspect the local Jacobian', copy };
    correct ? context.onCorrect?.() : context.onIncorrect?.();
    persist(); render(); animateSignal(correctPass, correct);
    announce(root, `${feedback.title}. ${copy}`);
  }

  function answerLayer(question) {
    if (paused || feedback?.correct) return;
    state.attempts += 1;
    const expected = deadNeuronIndices(question.values);
    const correct = expected.length === selected.size && expected.every((index) => selected.has(index));
    if (correct) state.score += feedback ? 80 : 130;
    feedback = { correct, title: correct ? 'Dead lanes identified' : 'One gate is misclassified', copy: correct ? `The ReLU Jacobian is diagonal with entries [${question.values.map(reluDerivative).join(', ')}]. Only zero entries erase their lanes.` : 'Check the pre-activation, not the ReLU output magnitude. Every positive value has derivative 1.' };
    correct ? context.onCorrect?.() : context.onIncorrect?.();
    persist(); render();
    root.querySelectorAll('.neuron').forEach((node, index) => node.dataset.state = expected.includes(index) ? 'blocked' : 'passing');
    announce(root, `${feedback.title}. ${feedback.copy}`);
  }

  function explain(question, correctPass, chosePass) {
    if (question.kind === 'chain') return correctPass ? 'Every local diagonal entry is 1, so their product stays non-zero.' : 'At least one local derivative is 0, so the serial Jacobian product becomes 0.';
    if (!correctPass) return question.value === 0 ? 'This arcade uses ReLU′(0)=0, so the incoming gradient stops.' : 'The pre-activation is negative. ReLU′(z)=0, so the incoming gradient stops here.';
    if (!chosePass) return 'A small positive activation is still on the open branch: ReLU′(z)=1.';
    return `The pre-activation is positive. ReLU(${question.value})=${relu(question.value)}, but its local derivative is 1.`;
  }

  function animateSignal(passes, correct) {
    if (!correct) return;
    root.querySelectorAll('.relu-gate').forEach((node) => { node.dataset.state = passes ? 'passing' : 'blocked'; node.querySelector('small').textContent = `local J = ${passes ? 1 : 0}`; });
    const scene = root.querySelector('.gate-scene');
    const particle = el('span', { className: `gradient-particle ${passes ? 'gradient-particle--pass' : 'gradient-particle--block'}`, 'aria-hidden': 'true' }, '●');
    scene.append(particle); const timer = setTimeout(() => { particle.remove(); timers.delete(timer); }, 1500); timers.add(timer);
  }

  function advance() {
    const stage = GATE_STAGES[state.stage]; feedback = null; selected = new Set();
    if (!isLastQuestion(stage)) state.question += 1;
    else {
      if (!state.completedStages.includes(state.stage)) state.completedStages.push(state.stage);
      if (state.stage < GATE_STAGES.length - 1) { state.stage += 1; state.question = 0; }
      else {
        persist();
        context.onComplete?.({ score: state.score, stars: scoreStars({ attempts: state.attempts, hints: state.hints, perfectThreshold: 17 }), hintsUsed: state.hints });
        return;
      }
    }
    persist(); render();
  }

  function isLastQuestion(stage) { return state.question >= stage.questions.length - 1; }
  function hint() { const hintNode = root.querySelector('[data-hint]'); if (!hintNode) return false; hintNode.hidden = false; state.hints += 1; store.save(state); context.onHint?.(); announce(root, hintNode.textContent); return true; }
  function restart() { state = store.reset(); selected = new Set(); feedback = null; persist(); render(); }
  function destroy() { timers.forEach(clearTimeout); timers.clear(); root.remove(); }
  function pause() { paused = true; root.inert = true; }
  function resume() { paused = false; root.inert = false; }

  persist(); render(); context.onReady?.();
  return { destroy, pause, resume, restart, hint };
}

function stat(label, value) { return el('div', {}, el('span', {}, label), el('strong', {}, String(value))); }
