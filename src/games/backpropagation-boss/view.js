import { Button } from '../../components/button.js';
import { el } from '../../utils/dom.js';
import { BOSS_NETWORK, BOSS_PHASES, TRANSFORMATIONS, backward } from './engine.js';
import { announce, createTrainingStore, scoreStars } from '../training-runtime.js';

const DEFAULTS = { schemaVersion: 1, phase: 0, edge: 0, completedPhases: [], score: 0, attempts: 0, hints: 0 };

export function createBackpropagationBoss(container, context, metadata) {
  const store = createTrainingStore(metadata.storageKey, DEFAULTS);
  let state = store.load();
  let selected = null;
  let feedback = null;
  let paused = false;
  let winning = false;
  const timers = new Set();
  const root = el('section', { className: 'training-game boss-battle', 'aria-label': 'Backpropagation Boss Battle' });
  container.replaceChildren(root);

  function phase() { return BOSS_PHASES[state.phase] ?? BOSS_PHASES[0]; }
  function persist() { store.save(state); context.onProgress?.({ completed: state.completedPhases.length, total: BOSS_PHASES.length, score: state.score }); }

  function render() {
    const current = phase(); const edge = current.edges[state.edge] ?? current.edges[0];
    root.replaceChildren(
      el('header', { className: 'boss-header' },
        el('div', {}, el('p', { className: 'eyebrow' }, 'Chapter III · Network core'), el('h1', {}, current.title), el('p', {}, current.subtitle)),
        el('div', { className: 'boss-health', 'aria-label': `Boss integrity ${bossHealth()} percent` }, el('span', {}, 'NETWORK CORRUPTION'), el('div', {}, el('i', { style: `width:${bossHealth()}%` })) )),
      el('main', { className: 'boss-workspace' },
        el('section', { className: 'network-arena' }, renderNetwork(current, edge), el('div', { className: 'boss-avatar', 'aria-hidden': 'true' }, el('span', {}, '∂'), el('i', {}))),
        el('section', { className: 'training-panel boss-console' },
          el('p', { className: 'eyebrow' }, `Backward route ${state.edge + 1} of ${current.edges.length}`),
          el('h2', {}, edge.label),
          el('p', {}, 'Which local transformation belongs on this edge?'),
          el('div', { className: 'transformation-tray', role: 'listbox', 'aria-label': 'Available local transformations' }, ...TRANSFORMATIONS.map((item) => transformationTile(item))),
          el('div', { className: `jacobian-socket ${selected ? 'jacobian-socket--filled' : ''}`, tabindex: '0', role: 'button', 'aria-label': 'Jacobian socket. Drop a transformation here.', ondragover: (event) => event.preventDefault(), ondrop: dropTile }, selected ? TRANSFORMATIONS.find((item) => item.id === selected)?.symbol : 'Drop or select a Jacobian'),
          Button('Route gradient', { kind: 'primary', disabled: !selected, onclick: checkEdge }),
          feedback ? el('div', { className: `training-feedback training-feedback--${feedback.correct ? 'correct' : 'wrong'}`, role: 'status' }, el('strong', {}, feedback.title), el('p', {}, feedback.copy), feedback.correct ? el('code', {}, edge.value) : null, feedback.correct ? Button(isLastEdge(current) ? (state.phase === 3 ? 'Deliver final update' : 'Break phase shield') : 'Light next edge', { kind: 'primary', onclick: advance }) : null) : null,
          !current.hard ? el('div', { className: 'training-hint', hidden: 'true', 'data-hint': '' }, `Look for the operation used on the forward path. Backward uses its local Jacobian: ${TRANSFORMATIONS.find((item) => item.id === edge.answer).label}.`) : el('p', { className: 'hard-mode' }, 'Mastery challenge · hints offline'))),
      el('div', { className: 'sr-only', 'aria-live': 'assertive', 'data-training-live': '' }));
  }

  function transformationTile(item) {
    return el('button', { type: 'button', className: `transform-tile ${selected === item.id ? 'transform-tile--selected' : ''}`, draggable: 'true', role: 'option', 'aria-selected': String(selected === item.id), dataset: { transform: item.id }, onclick: () => { selected = item.id; feedback = null; render(); }, ondragstart: (event) => event.dataTransfer.setData('text/plain', item.id) }, el('strong', {}, item.label), el('span', {}, item.symbol));
  }

  function dropTile(event) { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (TRANSFORMATIONS.some((item) => item.id === id)) { selected = id; feedback = null; render(); } }

  function checkEdge() {
    if (paused || winning || feedback?.correct) return;
    const edge = phase().edges[state.edge]; const transformation = TRANSFORMATIONS.find((item) => item.id === edge.answer); state.attempts += 1;
    const correct = selected === edge.answer;
    if (correct) state.score += feedback ? 90 : phase().hard ? 180 : 140;
    feedback = { correct, title: correct ? 'Gradient routed' : 'The boss deflects that Jacobian', copy: correct ? transformation.why : diagnose(selected, edge.answer) };
    correct ? context.onCorrect?.() : context.onIncorrect?.();
    persist(); render();
    if (correct) root.querySelector(`[data-edge="${edge.id}"]`)?.classList.add('network-edge--lit');
    if (!correct) {
      root.classList.add('boss-battle--hit');
      const timer = setTimeout(() => { root.classList.remove('boss-battle--hit'); timers.delete(timer); }, 520); timers.add(timer);
    }
    announce(root, `${feedback.title}. ${feedback.copy}`);
  }

  function diagnose(chosen, expected) {
    if (chosen === 'transpose-matmul' && expected === 'outer-product') return 'Wᵀ routes a gradient to an earlier activation; a parameter gradient pairs the incoming gradient with the forward input.';
    if (chosen === 'outer-product' && expected === 'transpose-matmul') return 'An outer product builds a weight-shaped gradient. This edge needs a gradient routed to the previous activation.';
    if (expected === 'relu-mask') return 'This is an element-wise activation gate. Use its diagonal 0/1 Jacobian before continuing.';
    if (expected === 'bias-reduction') return 'The forward operation broadcast one parameter to several lanes. Backward must add those returning contributions.';
    return 'Trace the forward operation on this edge, then choose the matching local Jacobian from a previous arcade game.';
  }

  function advance() {
    const current = phase(); selected = null; feedback = null;
    if (!isLastEdge(current)) state.edge += 1;
    else {
      if (!state.completedPhases.includes(state.phase)) state.completedPhases.push(state.phase);
      if (state.phase < BOSS_PHASES.length - 1) { state.phase += 1; state.edge = 0; }
      else { persist(); victory(); return; }
    }
    persist(); render();
  }

  function renderNetwork(current, activeEdge) {
    const values = backward(BOSS_NETWORK);
    return el('div', { className: 'network-diagram', 'aria-label': 'Two input, three hidden neuron, one output network' },
      layer('Input', ['x₁=1', 'x₂=−2']),
      edgeColumn('Linear W₁', current, activeEdge, ['hidden-input', 'hidden-weights', 'final-w1-back', 'final-dw1']),
      layer('Pre-activation', values.z1.map((value, index) => `z${index + 1}=${value}`)),
      edgeColumn('ReLU', current, activeEdge, ['relu-backward', 'final-relu']),
      layer('Hidden', values.h.map((value, index) => `h${index + 1}=${value}`)),
      edgeColumn('Linear W₂', current, activeEdge, ['output-hidden', 'output-weights', 'final-w2-back', 'final-dw2']),
      layer('Output', [`ŷ=${values.prediction}`]),
      edgeColumn('Loss', current, activeEdge, ['loss-output', 'final-loss']),
      layer('Loss', [`L=${values.loss}`]));
  }

  function layer(label, nodes) { return el('div', { className: 'network-layer' }, el('strong', {}, label), ...nodes.map((node) => el('span', {}, node))); }
  function edgeColumn(label, current, activeEdge, ids) {
    const edge = current.edges.find((item) => ids.includes(item.id)); const completeIndex = edge ? current.edges.indexOf(edge) : -1; const complete = completeIndex >= 0 && completeIndex < state.edge;
    return el('div', { className: `network-edge ${edge?.id === activeEdge.id ? 'network-edge--active' : ''} ${complete ? 'network-edge--lit' : ''}`, dataset: edge ? { edge: edge.id } : {} }, el('i', {}), el('small', {}, label));
  }

  function victory() {
    winning = true;
    root.replaceChildren(el('section', { className: 'boss-victory' }, el('p', { className: 'eyebrow' }, 'Network restored'), el('h1', {}, 'You reconstructed backpropagation.'), el('div', { className: 'training-loop', 'aria-label': 'Forward, backward, gradient, weight update, lower loss loop' }, ...['Forward', 'Backward', 'Gradient', 'Weight update', 'Lower loss'].map((label, index) => el('span', { style: `--delay:${index}` }, label))), el('p', {}, 'Nothing magical was hiding inside—only local Jacobians composed in reverse.')));
    const timer = setTimeout(() => {
      timers.delete(timer);
      context.onComplete?.({ score: state.score, stars: scoreStars({ attempts: state.attempts, hints: state.hints, perfectThreshold: 15 }), hintsUsed: state.hints });
    }, 2800); timers.add(timer);
  }

  function bossHealth() { const solvedBefore = BOSS_PHASES.slice(0, state.phase).reduce((sum, item) => sum + item.edges.length, 0); const solvedHere = Math.min(state.edge, phase().edges.length); const total = BOSS_PHASES.reduce((sum, item) => sum + item.edges.length, 0); return Math.max(0, Math.round(100 - ((solvedBefore + solvedHere) / total) * 100)); }
  function isLastEdge(current) { return state.edge >= current.edges.length - 1; }
  function hint() { if (phase().hard) return false; const node = root.querySelector('[data-hint]'); if (!node) return false; node.hidden = false; state.hints += 1; store.save(state); context.onHint?.(); announce(root, node.textContent); return true; }
  function restart() { timers.forEach(clearTimeout); timers.clear(); state = store.reset(); selected = null; feedback = null; winning = false; persist(); render(); }
  function destroy() { timers.forEach(clearTimeout); timers.clear(); root.remove(); }
  function pause() { paused = true; root.inert = true; }
  function resume() { paused = false; root.inert = false; }

  persist(); render(); context.onReady?.();
  return { destroy, pause, resume, restart, hint };
}
