import { Button } from '../../components/button.js';
import { el } from '../../utils/dom.js';
import { LANDSCAPES, converged, finitePoint, gradientStep } from './engine.js';
import { announce, createTrainingStore, scoreStars } from '../training-runtime.js';

const DEFAULTS = { schemaVersion: 1, level: 0, completedLevels: [], score: 0, attempts: 0, hints: 0 };

export function createGradientDescentNavigator(container, context, metadata) {
  const store = createTrainingStore(metadata.storageKey, DEFAULTS);
  let state = store.load();
  let point = LANDSCAPES[state.level]?.start.slice() ?? LANDSCAPES[0].start.slice();
  let path = [point.slice()];
  let losses = [LANDSCAPES[state.level]?.loss(point) ?? 0];
  let direction = 'downhill';
  let rate = LANDSCAPES[state.level]?.initialRate ?? LANDSCAPES[state.level]?.learningRate ?? .1;
  let running = false;
  let paused = false;
  let destroyed = false;
  let raf = 0;
  let resolveAnimation = null;
  let feedback = null;
  const root = el('section', { className: 'training-game navigator', 'aria-label': 'Gradient Descent Navigator' });
  container.replaceChildren(root);

  function landscape() { return LANDSCAPES[state.level] ?? LANDSCAPES[0]; }
  function persist() { store.save(state); context.onProgress?.({ completed: state.completedLevels.length, total: LANDSCAPES.length, score: state.score }); }

  function render() {
    const level = landscape();
    root.replaceChildren(
      el('header', { className: 'training-intro' }, el('p', { className: 'eyebrow' }, `Chapter III · Expedition ${state.level + 1} of ${LANDSCAPES.length}`), el('h1', {}, level.title), el('p', {}, level.story)),
      el('div', { className: 'training-status' }, stat('Loss', formatLoss(level.loss(point)), 'current-loss'), stat('Steps', path.length - 1, 'step-count'), stat('Target', `≤ ${level.target}`)),
      el('main', { className: 'navigator-workspace' },
        el('section', { className: 'landscape-card', 'aria-label': 'Loss contour map' },
          el('svg', { className: 'contour-map', viewBox: '0 0 420 420', role: 'img', 'aria-label': 'Contour map with rover, gradient arrow, and parameter trace' },
            el('defs', {}, el('radialGradient', { id: 'terrain-glow' }, el('stop', { offset: '0%', 'stop-color': 'var(--surface)' }), el('stop', { offset: '100%', 'stop-color': 'var(--surface-soft)' }))),
            el('rect', { x: 0, y: 0, width: 420, height: 420, rx: 24, fill: 'url(#terrain-glow)' }),
            ...[55, 100, 150, 205].map((radius) => el('ellipse', { className: 'contour', cx: 210, cy: 210, rx: radius * level.contours[0], ry: radius / level.contours[1] })),
            el('polyline', { className: 'parameter-trace', points: '', 'data-trace': '' }),
            el('line', { className: 'gradient-arrow', x1: 0, y1: 0, x2: 0, y2: 0, 'data-arrow': '', markerEnd: 'url(#arrowhead)' }),
            el('defs', {}, el('marker', { id: 'arrowhead', markerWidth: 7, markerHeight: 7, refX: 5, refY: 3, orient: 'auto' }, el('path', { d: 'M0,0 L0,6 L6,3 z' }))),
            el('g', { className: 'rover', 'data-rover': '' }, el('circle', { r: 15 }), el('path', { d: 'M-8 0h16M0-8v16' }))),
          el('div', { className: 'loss-sparkline' }, el('span', {}, 'Loss trace'), el('svg', { viewBox: '0 0 300 70', preserveAspectRatio: 'none' }, el('polyline', { points: '', 'data-loss-trace': '' })))),
        el('section', { className: 'training-panel navigator-controls' },
          el('p', { className: 'eyebrow' }, 'Optimizer controls'),
          el('h2', {}, 'Choose the direction and step size'),
          el('div', { className: 'direction-toggle', role: 'group', 'aria-label': 'Movement direction' },
            Button('Downhill · −∇L', { kind: direction === 'downhill' ? 'primary' : 'secondary', 'aria-pressed': String(direction === 'downhill'), onclick: () => { direction = 'downhill'; feedback = null; render(); updateVisuals(); } }),
            Button('Uphill · +∇L', { kind: direction === 'uphill' ? 'primary' : 'secondary', 'aria-pressed': String(direction === 'uphill'), onclick: () => { direction = 'uphill'; feedback = null; render(); updateVisuals(); } })),
          el('label', { className: 'learning-rate' }, el('span', {}, el('strong', {}, 'Learning rate η'), el('output', { for: 'eta-slider', 'data-eta-output': '' }, rate.toFixed(2))), el('input', { id: 'eta-slider', type: 'range', min: '.01', max: '1', step: '.01', value: String(rate), oninput: updateRateOutput })),
          el('div', { className: 'button-row button-row--left' }, Button('Take one step', { onclick: () => run(1) }), Button('Run 8 steps', { kind: 'primary', onclick: () => run(8) }), Button('Reset rover', { onclick: resetLevel })),
          feedback ? el('div', { className: `training-feedback training-feedback--${feedback.correct ? 'correct' : 'wrong'}`, role: 'status' }, el('strong', {}, feedback.title), el('p', {}, feedback.copy), feedback.complete ? Button(state.level === LANDSCAPES.length - 1 ? 'Finish navigation' : 'Next landscape', { kind: 'primary', onclick: completeLevel }) : null) : null,
          el('aside', { className: 'training-why' }, el('strong', {}, 'Read the terrain'), el('p', {}, level.lesson)),
          el('div', { className: 'training-hint', hidden: 'true', 'data-hint': '' }, `Try η near ${level.learningRate}. Watch whether loss falls smoothly, crawls, or oscillates.`))),
      el('div', { className: 'sr-only', 'aria-live': 'assertive', 'data-training-live': '' }));
    updateVisuals();
  }

  function updateRateOutput(event) { rate = Number(event.target.value); const output = root.querySelector('[data-eta-output]'); if (output) output.textContent = rate.toFixed(2); }
  function currentRate() { return rate; }

  async function run(steps) {
    if (running || paused || feedback?.complete) return;
    running = true; state.attempts += 1; const level = landscape(); const before = level.loss(point); const rate = currentRate();
    for (let index = 0; index < steps && !paused; index += 1) {
      const next = gradientStep(level, point, rate, direction);
      if (!finitePoint(next)) { feedback = { correct: false, title: 'Rover lost beyond the map', copy: 'The step size made the update diverge. Reset and reduce η.' }; break; }
      await animate(point, next, 180); point = next; path.push(point.slice()); losses.push(level.loss(point)); updateVisuals();
      if (converged(level, point)) break;
    }
    if (paused || destroyed) { running = false; return; }
    const after = level.loss(point);
    if (converged(level, point)) { state.score += Math.max(80, 180 - path.length * 3); feedback = { correct: true, complete: true, title: 'Low-loss zone reached', copy: 'The negative gradient and learning rate worked together: each update reduced the objective.' }; }
    else if (after > before * 1.1) feedback = { correct: false, title: direction === 'uphill' ? 'The rover climbed' : 'The rover overshot', copy: direction === 'uphill' ? 'The gradient points toward increasing loss. Gradient descent subtracts it.' : 'η is too large for this curvature, so the trace oscillates or escapes.' };
    else if (after > before * .97) feedback = { correct: false, title: 'Progress is nearly stalled', copy: 'The direction is useful, but this learning rate makes very little progress through the visible terrain.' };
    else feedback = { correct: true, title: 'Loss is descending', copy: 'The trace moved downhill. Continue stepping or tune η for faster convergence.' };
    feedback.correct ? context.onCorrect?.() : context.onIncorrect?.();
    running = false; persist(); render(); announce(root, `${feedback.title}. ${feedback.copy}`);
  }

  function animate(from, to, duration) {
    return new Promise((resolve) => {
      resolveAnimation = resolve;
      const start = performance.now();
      const tick = (now) => {
        if (paused) { finishAnimation(); return; }
        const t = Math.min(1, (now - start) / duration); const eased = 1 - ((1 - t) ** 3);
        const shown = from.map((value, index) => value + (to[index] - value) * eased); positionRover(shown);
        if (t < 1) raf = requestAnimationFrame(tick); else finishAnimation();
      };
      raf = requestAnimationFrame(tick);
    });
  }

  function finishAnimation() { const resolve = resolveAnimation; resolveAnimation = null; resolve?.(); }
  function cancelRun() { cancelAnimationFrame(raf); finishAnimation(); running = false; }

  function updateVisuals() {
    positionRover(point);
    const trace = root.querySelector('[data-trace]'); if (trace) trace.setAttribute('points', path.map(mapPoint).map(([x, y]) => `${x},${y}`).join(' '));
    const level = landscape(); const gradient = level.gradient(point); const [x, y] = mapPoint(point); const scale = Math.min(45, 12 + Math.hypot(...gradient) * 3); const norm = Math.hypot(...gradient) || 1;
    const arrow = root.querySelector('[data-arrow]'); if (arrow) { arrow.setAttribute('x1', x); arrow.setAttribute('y1', y); arrow.setAttribute('x2', x + gradient[0] / norm * scale); arrow.setAttribute('y2', y - gradient[1] / norm * scale); }
    const maxLoss = Math.max(...losses, .001); const spark = root.querySelector('[data-loss-trace]'); if (spark) spark.setAttribute('points', losses.map((loss, index) => `${(index / Math.max(1, losses.length - 1)) * 300},${65 - Math.min(60, loss / maxLoss * 60)}`).join(' '));
    const lossNode = root.querySelector('[data-current-loss]'); if (lossNode) lossNode.textContent = formatLoss(level.loss(point));
    const stepNode = root.querySelector('[data-step-count]'); if (stepNode) stepNode.textContent = String(path.length - 1);
  }

  function positionRover(value) { const rover = root.querySelector('[data-rover]'); if (rover) { const [x, y] = mapPoint(value); rover.setAttribute('transform', `translate(${x} ${y})`); } }
  function mapPoint([x, y]) { return [210 + Math.max(-5, Math.min(5, x)) * 36, 210 - Math.max(-5, Math.min(5, y)) * 36]; }

  function completeLevel() {
    if (!state.completedLevels.includes(state.level)) state.completedLevels.push(state.level);
    if (state.level < LANDSCAPES.length - 1) { state.level += 1; resetPosition(); feedback = null; persist(); render(); }
    else { persist(); context.onComplete?.({ score: state.score, stars: scoreStars({ attempts: state.attempts, hints: state.hints, perfectThreshold: 12 }), hintsUsed: state.hints }); }
  }
  function resetPosition() { point = landscape().start.slice(); path = [point.slice()]; losses = [landscape().loss(point)]; direction = 'downhill'; rate = landscape().initialRate ?? landscape().learningRate; }
  function resetLevel() { cancelRun(); resetPosition(); feedback = null; render(); }
  function restart() { cancelRun(); state = store.reset(); resetPosition(); feedback = null; persist(); render(); }
  function hint() { const node = root.querySelector('[data-hint]'); if (!node) return false; node.hidden = false; state.hints += 1; store.save(state); context.onHint?.(); announce(root, node.textContent); return true; }
  function destroy() { destroyed = true; cancelRun(); root.remove(); }
  function pause() { paused = true; cancelRun(); root.inert = true; }
  function resume() { paused = false; root.inert = false; }

  persist(); render(); context.onReady?.();
  return { destroy, pause, resume, restart, hint };
}

function stat(label, value, marker) { return el('div', {}, el('span', {}, label), el('strong', marker ? { [`data-${marker}`]: '' } : {}, String(value))); }
function formatLoss(value) { return value >= 100 ? value.toFixed(0) : value >= 1 ? value.toFixed(2) : value.toFixed(3); }
