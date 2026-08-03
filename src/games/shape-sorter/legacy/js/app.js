import { LEVELS, CONCEPT_LABELS } from './data/levels.js';
import { NOTEBOOK_ENTRIES } from './data/notebook.js';
import { generateLevelQuestions } from './engine/question-generator.js';
import { validateSubmission } from './engine/validator.js';
import { scoreRound } from './engine/scoring.js';
import { updateConceptMastery, masteryPercent } from './engine/mastery.js';
import { formatShape } from './engine/shape-math.js';
import { getState, setState, subscribe, DEFAULT_STATE, resetInMemory } from './state.js';
import { clearState, exportState, importState, saveState } from './storage.js';
import { renderMath } from './math-renderer.js';
import { applyAccessibilitySettings, announce } from './accessibility.js';

const main = document.querySelector('#main');
const DEBUG_MODE = new URLSearchParams(window.location.search).get('debug') === '1';
let tutorialStep = 0;
let questions = [];
let roundState = freshRoundState();

function freshRoundState() {
  return {
    category: null,
    rows: '',
    columns: '',
    validity: null,
    reasons: [],
    attempts: 0,
    hintsUsed: 0,
    visibleHints: [],
    answered: false,
    feedback: null
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function latex(value, display = true) {
  const fallback = readableMath(value);
  return `<span class="math-node ${display ? 'math-display' : 'math-inline'}" data-tex="${escapeHtml(value)}" data-math-display="${display ? 'block' : 'inline'}">${escapeHtml(fallback)}</span>`;
}

function readableMath(value) {
  return String(value)
    .replaceAll('\\mathbb{R}', 'ℝ')
    .replaceAll('\\partial', '∂')
    .replaceAll('\\Rightarrow', '⇒')
    .replaceAll('\\to', '→')
    .replaceAll('\\times', '×')
    .replaceAll('\\in', '∈')
    .replaceAll('\\quad', '  ')
    .replaceAll('\\operatorname{ReLU}', 'ReLU')
    .replace(/\\(?:mathbf|text)\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\begin\{bmatrix\}/g, '[')
    .replace(/\\end\{bmatrix\}/g, ']')
    .replaceAll('\\\\', '; ')
    .replaceAll('&', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function navigate(view) {
  setState((state) => {
    state.session.view = view;
    return state;
  });
}

function render() {
  const state = getState();
  applyAccessibilitySettings(state.settings);
  const view = state.session.view;
  if (view === 'welcome') renderWelcome(state);
  else if (view === 'map') renderMap(state);
  else if (view === 'tutorial') renderTutorial(state);
  else if (view === 'game') renderGame(state);
  else if (view === 'results') renderResults(state);
  else if (view === 'progress') renderProgress(state);
  else if (view === 'notebook') renderNotebook();
  else renderWelcome(state);
  renderMath(main);
  attachDragAndDrop();
}

function renderWelcome(state) {
  const mastery = masteryPercent(state.mastery);
  const hasProgress = state.progress.totalRounds > 0 || state.progress.tutorialComplete;
  main.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">Matrix calculus game 01</div>
        <h1>Know the shape<br>before the algebra.</h1>
        <p class="lede">Sort gradients and Jacobians, repair transpose mistakes, and make chain-rule blocks snap together. Shape intuition turns matrix calculus from symbol soup into structured reasoning.</p>
        <div class="actions">
          <button class="btn btn-primary" type="button" data-action="${state.progress.tutorialComplete ? 'open-map' : 'start-tutorial'}">${state.progress.tutorialComplete ? 'Open learning map' : 'Start learning'}</button>
          ${hasProgress ? '<button class="btn" type="button" data-action="continue">Continue</button>' : ''}
          <button class="btn btn-quiet" type="button" data-nav="notebook">Open shape notebook</button>
        </div>
        <p><strong>${mastery}%</strong> current concept mastery</p>
      </div>
      <aside class="hero-machine" aria-label="Derivative shape machine illustration">
        <div class="machine-title">The derivative shape machine</div>
        <div class="machine-flow">
          <div class="machine-row"><div class="shape-token">2 outputs</div><div class="arrow">→</div><div class="shape-token">2 rows</div></div>
          <div class="machine-row"><div class="shape-token">3 inputs</div><div class="arrow">→</div><div class="shape-token">3 columns</div></div>
        </div>
        <div class="rule-card">${latex('\\mathbf{f}:\\mathbb{R}^{3}\\to\\mathbb{R}^{2}\\quad\\Rightarrow\\quad\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{2\\times3}', false)}</div>
      </aside>
    </section>`;
}

function renderMap(state) {
  const cards = LEVELS.map((level) => {
    const locked = !DEBUG_MODE && level.id > state.progress.unlockedLevel;
    const completed = state.progress.completedLevels.includes(level.id);
    const best = state.progress.bestScores[level.id] ?? 0;
    const conceptScores = level.concepts.map((id) => state.mastery[id]?.masteryState ?? 'not-introduced');
    const mastered = conceptScores.filter((x) => x === 'mastered').length;
    const pct = Math.round((mastered / level.concepts.length) * 100);
    return `
      <article class="card level-card ${locked ? 'locked' : ''}">
        <div class="level-number">${level.id}</div>
        <h3>${escapeHtml(level.title)}</h3>
        <p>${escapeHtml(level.subtitle)}</p>
        <div class="progress-track" aria-label="${pct}% concepts mastered"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="level-meta"><span>${completed ? 'Completed' : locked ? 'Locked' : 'Available'}</span><span>Best ${best}</span></div>
        <div class="actions">
          <button class="btn ${locked ? '' : 'btn-primary'}" type="button" data-action="start-level" data-level="${level.id}" ${locked ? 'disabled' : ''}>${completed ? 'Replay' : level.optional ? 'Start optional sprint' : 'Start level'}</button>
        </div>
      </article>`;
  }).join('');
  main.innerHTML = `
    <section>
      <header class="page-header"><div><div class="eyebrow">Learning journey</div><h2>From objects to backprop shapes</h2><p>Levels unlock in sequence. Completed levels remain available for spaced review.</p></div><button class="btn" type="button" data-nav="progress">View progress</button></header>
      <div class="level-grid">${cards}</div>
    </section>`;
}

const TUTORIAL_STEPS = [
  {
    title: 'Count outputs',
    body: 'Each output component contributes one Jacobian row.',
    visual: `<div class="component-stack"><div class="component-pill">f₁(x)</div><div class="component-pill">f₂(x)</div></div><p><strong>2 outputs → 2 rows</strong></p>`,
    equation: '\\mathbf{f}(\\mathbf{x})=\\begin{bmatrix}f_1(\\mathbf{x})\\\\f_2(\\mathbf{x})\\end{bmatrix}'
  },
  {
    title: 'Count inputs',
    body: 'Each input component contributes one Jacobian column.',
    visual: `<div class="component-stack"><div class="component-pill">x₁</div><div class="component-pill">x₂</div><div class="component-pill">x₃</div></div><p><strong>3 inputs → 3 columns</strong></p>`,
    equation: '\\mathbf{x}=\\begin{bmatrix}x_1\\\\x_2\\\\x_3\\end{bmatrix}'
  },
  {
    title: 'Build the shape',
    body: 'Put outputs first and inputs second: output-by-input.',
    visual: `<div class="mini-grid" style="grid-template-columns:repeat(3,64px)">${Array.from({length: 6}, () => '<div class="mini-grid-cell">□</div>').join('')}</div><p><strong>2 rows × 3 columns</strong></p>`,
    equation: '\\mathbf{f}:\\mathbb{R}^{3}\\to\\mathbb{R}^{2}\\Rightarrow\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{2\\times3}'
  },
  {
    title: 'Interpret one cell',
    body: 'A Jacobian cell connects one output component to one input component.',
    visual: `<div class="mini-grid" style="grid-template-columns:repeat(3,80px)"><div class="mini-grid-cell">∂f₁/∂x₁</div><div class="mini-grid-cell">∂f₁/∂x₂</div><div class="mini-grid-cell">∂f₁/∂x₃</div><div class="mini-grid-cell">∂f₂/∂x₁</div><div class="mini-grid-cell">∂f₂/∂x₂</div><div class="mini-grid-cell" style="border:3px solid var(--accent)">∂f₂/∂x₃</div></div>`,
    equation: '\\left[\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\right]_{2,3}=\\frac{\\partial f_2}{\\partial x_3}'
  },
  {
    title: 'Keep the convention visible',
    body: 'This game uses numerator layout. A scalar loss differentiated with respect to an n-vector is a 1 × n row vector.',
    visual: `<div class="rule-card">Rows = outputs<br>Columns = inputs</div><p>Other resources may transpose this convention. Shape Sorter never switches silently.</p>`,
    equation: '\\frac{\\partial L}{\\partial\\mathbf{w}}\\in\\mathbb{R}^{1\\times n}'
  }
];

function renderTutorial() {
  const step = TUTORIAL_STEPS[tutorialStep];
  main.innerHTML = `
    <section class="tutorial">
      <header class="page-header"><div><div class="eyebrow">Interactive tutorial · ${tutorialStep + 1}/${TUTORIAL_STEPS.length}</div><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.body)}</p></div></header>
      <div class="panel tutorial-stage">
        <div class="tutorial-visual">${step.visual}</div>
        <div class="prompt-card">${latex(step.equation)}</div>
        <div class="actions">
          <button class="btn" type="button" data-action="tutorial-back" ${tutorialStep === 0 ? 'disabled' : ''}>Back</button>
          <button class="btn btn-primary" type="button" data-action="tutorial-next">${tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Enter the workshop' : 'Next'}</button>
        </div>
      </div>
    </section>`;
}

function startLevel(levelId) {
  const level = LEVELS.find((item) => item.id === levelId);
  if (!level) return;
  const seed = Date.now() % 1000000000;
  questions = generateLevelQuestions(level.id, level.rounds, seed, getState());
  roundState = freshRoundState();
  setState((state) => {
    state.session.view = 'game';
    state.session.activeLevel = level.id;
    state.session.seed = seed;
    state.session.roundIndex = 0;
    state.session.levelStartScore = state.progress.score;
    state.progress.currentLevel = level.id;
    return state;
  });
}

function currentQuestion(state) {
  if (!questions.length && state.session.activeLevel) {
    const level = LEVELS.find((item) => item.id === state.session.activeLevel);
    questions = generateLevelQuestions(level.id, level.rounds, state.session.seed ?? 1, state);
  }
  return questions[state.session.roundIndex];
}

function shapeIcon(category) {
  const icons = {
    scalar: '●',
    'row-vector': '[ □  □  □ ]',
    'column-vector': '┌ □ ┐\n│ □ │\n└ □ ┘',
    matrix: '┌ □ □ ┐\n└ □ □ ┘'
  };
  return icons[category];
}

function renderGame(state) {
  const level = LEVELS.find((item) => item.id === state.session.activeLevel);
  const q = currentQuestion(state);
  if (!level || !q) return renderMap(state);
  const progress = Math.round(((state.session.roundIndex + (roundState.answered ? 1 : 0)) / questions.length) * 100);
  const reasonRequired = (q.metadata?.reasonIds ?? []).length > 0;
  const validityOnly = q.kind === 'validity';
  const bins = ['scalar', 'row-vector', 'column-vector', 'matrix'].map((category) => `
    <button class="shape-bin ${roundState.category === category ? 'selected' : ''}" type="button" data-action="select-shape" data-category="${category}" role="option" aria-selected="${roundState.category === category}">
      <span class="shape-icon" aria-hidden="true">${shapeIcon(category)}</span>
      <strong>${category.replace('-', ' ')}</strong>
    </button>`).join('');
  const reasons = q.reasons.map((reason) => `<button class="reason-tile ${roundState.reasons.includes(reason.id) ? 'selected' : ''}" type="button" data-action="toggle-reason" data-reason="${reason.id}">${escapeHtml(reason.text)}</button>`).join('');
  const hints = roundState.visibleHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join('');
  main.innerHTML = `
    <section class="game-shell">
      <div class="game-topline">
        <div><div class="eyebrow">Level ${level.id}: ${escapeHtml(level.title)}</div><strong>Round ${state.session.roundIndex + 1} of ${questions.length}</strong></div>
        <div class="stat-chip">Score ${state.progress.score}</div>
        <div class="stat-chip">Streak ${state.progress.currentStreak}</div>
        <div class="progress-track" aria-label="Level progress ${progress}%"><div class="progress-fill" style="width:${progress}%"></div></div>
      </div>
      <div class="game-grid">
        <article class="panel workspace">
          <div class="prompt-card">
            <strong>${escapeHtml(q.prompt)}</strong>
            <div class="context-row"><span class="context-badge">Numerator layout</span><span class="context-badge">${escapeHtml(q.kind)}</span></div>
            ${latex(q.contextLatex)}
          </div>
          <div class="derivative-card" draggable="${validityOnly ? 'false' : 'true'}" tabindex="0" role="button" aria-grabbed="false" aria-label="Expression to classify: ${escapeHtml(q.derivativeLatex)}">
            ${latex(q.derivativeLatex)}
          </div>
          ${validityOnly ? `
            <p class="instruction">Choose whether the product is valid in this order.</p>
            <div class="actions" style="justify-content:center">
              <button class="btn ${roundState.validity === true ? 'btn-primary' : ''}" type="button" data-action="choose-validity" data-validity="true">Valid product</button>
              <button class="btn ${roundState.validity === false ? 'btn-primary' : ''}" type="button" data-action="choose-validity" data-validity="false">Not valid</button>
            </div>` : `
            <p class="instruction">Move the expression into a shape bin, then enter its exact dimensions.</p>
            <div class="shape-bins" role="listbox" aria-label="Shape categories">${bins}</div>
            <div class="answer-panel">
              <div class="dimension-builder">
                <label>Rows<input id="rows" inputmode="numeric" min="1" max="9" type="number" value="${escapeHtml(roundState.rows)}" aria-label="Number of rows"></label>
                <span class="times" aria-hidden="true">×</span>
                <label>Columns<input id="columns" inputmode="numeric" min="1" max="9" type="number" value="${escapeHtml(roundState.columns)}" aria-label="Number of columns"></label>
              </div>
              ${reasonRequired ? `<p class="instruction">Explain your choice for a reasoning bonus (optional):</p><div class="reason-tiles">${reasons}</div>` : ''}
            </div>`}
          <div class="workspace-actions">
            <button class="btn" type="button" data-action="hint" ${roundState.hintsUsed >= q.hints.length || roundState.answered ? 'disabled' : ''}>Hint ${Math.min(roundState.hintsUsed + 1, q.hints.length)}</button>
            <button class="btn btn-primary" type="button" data-action="check" ${roundState.answered ? 'disabled' : ''}>Check answer</button>
            <button class="btn" type="button" data-action="skip-round" ${roundState.answered ? 'disabled' : ''}>Skip question</button>
            <button class="btn btn-quiet" type="button" data-action="reset-round" ${roundState.answered ? 'disabled' : ''}>Reset round</button>
          </div>
        </article>
        <aside class="panel side-panel">
          <section><h3>Shape rule</h3><p><strong>Rows = outputs</strong><br><strong>Columns = inputs</strong></p><p class="instruction">For chain products, matching inner dimensions disappear.</p></section>
          <section><h3>Hints</h3>${hints ? `<ol class="hint-list">${hints}</ol>` : '<p>No hints used.</p>'}</section>
          <section><h3>Feedback</h3>${renderFeedback(q)}</section>
        </aside>
      </div>
    </section>`;
}

function renderFeedback(question) {
  if (!roundState.feedback) return '<p>Submit an answer to see diagnostic feedback.</p>';
  const result = roundState.feedback;
  if (!result.correct) {
    return `<div class="feedback incorrect"><strong>Not yet.</strong><p>${escapeHtml(result.feedback)}</p><button class="btn" type="button" data-action="retry">Try again</button></div>`;
  }
  const proof = question.kind === 'validity' ? '' : renderProofGrid(question.expected);
  return `<div class="feedback correct"><strong>Correct.</strong><p>${escapeHtml(result.feedback)}</p>${question.revealLatex ? latex(question.revealLatex) : ''}${proof}<p><strong>Backprop connection:</strong> ${escapeHtml(backpropConnection(question))}</p><button class="btn btn-primary" type="button" data-action="next-round">${isLastRound() ? 'Finish level' : 'Next round'}</button></div>`;
}

function renderProofGrid(expected) {
  const cells = [];
  for (let r = 1; r <= expected.rows; r += 1) {
    const row = [];
    for (let c = 1; c <= expected.columns; c += 1) row.push(`<div class="proof-cell">∂f${expected.rows > 1 ? `<sub>${r}</sub>` : ''}/∂x${expected.columns > 1 ? `<sub>${c}</sub>` : ''}</div>`);
    cells.push(`<div class="proof-row" style="grid-template-columns:repeat(${expected.columns},minmax(62px,1fr))">${row.join('')}</div>`);
  }
  return `<div class="proof-grid" aria-label="${expected.rows} by ${expected.columns} derivative grid">${cells.join('')}</div>`;
}

function backpropConnection(question) {
  if (question.kind === 'multiply' || question.kind === 'validity') return 'Backpropagation multiplies local Jacobians only when adjacent dimensions are compatible.';
  if (question.expected.rows === 1 && question.expected.columns > 1) return 'A scalar loss sends one sensitivity value toward every parameter component, forming a row gradient.';
  if (question.expected.rows > 1 && question.expected.columns > 1) return 'This Jacobian maps changes in each input component to changes in every output component.';
  return 'This local derivative can be composed with neighbouring derivatives in a computation graph.';
}

function isLastRound() {
  return getState().session.roundIndex >= questions.length - 1;
}

function submitAnswer() {
  const state = getState();
  const q = currentQuestion(state);
  if (!q || roundState.answered) return;
  syncInputs();
  roundState.attempts += 1;
  const submission = {
    category: roundState.category,
    rows: roundState.rows,
    columns: roundState.columns,
    validity: roundState.validity,
    reasons: roundState.reasons
  };
  const result = validateSubmission(q, submission);
  roundState.feedback = result;

  const firstAttempt = roundState.attempts === 1;
  setState((next) => {
    for (const concept of q.concepts) {
      next.mastery[concept] = updateConceptMastery(next.mastery[concept], {
        correct: result.correct,
        firstAttempt,
        hintsUsed: roundState.hintsUsed,
        misconception: result.misconception,
        context: q.kind
      });
    }
    if (result.misconception) next.misconceptions[result.misconception] = (next.misconceptions[result.misconception] ?? 0) + 1;
    next.progress.totalAttempts += 1;
    if (result.correct) {
      next.progress.correctAttempts += 1;
      const gained = scoreRound({ firstAttempt, hintsUsed: roundState.hintsUsed, reasonCompleted: result.reasonCorrect, streak: next.progress.currentStreak + 1 });
      next.progress.score += gained;
      next.progress.currentStreak += 1;
      next.progress.totalRounds += 1;
      next.progress.correctRounds += 1;
      next.progress.hintsUsed += roundState.hintsUsed;
    } else {
      next.progress.currentStreak = 0;
    }
    return next;
  });
  if (result.correct) {
    roundState.answered = true;
    announce(`Correct. ${result.feedback}`);
  } else {
    announce(`Not yet. ${result.feedback}`);
  }
  render();
}

function nextRound({ skipped = false } = {}) {
  const state = getState();
  if (isLastRound()) {
    completeLevel(state.session.activeLevel, { resetStreak: skipped });
    return;
  }
  roundState = freshRoundState();
  setState((next) => {
    next.session.roundIndex += 1;
    if (skipped) next.progress.currentStreak = 0;
    return next;
  });
}

function skipRound() {
  const q = currentQuestion(getState());
  if (!q || roundState.answered) return;
  announce('Question skipped.');
  nextRound({ skipped: true });
}

function completeLevel(levelId, { resetStreak = false } = {}) {
  const gained = getState().progress.score - (getState().session.levelStartScore ?? 0);
  setState((state) => {
    if (!state.progress.completedLevels.includes(levelId)) state.progress.completedLevels.push(levelId);
    state.progress.bestScores[levelId] = Math.max(state.progress.bestScores[levelId] ?? 0, gained);
    if (levelId < LEVELS.length) state.progress.unlockedLevel = Math.max(state.progress.unlockedLevel, levelId + 1);
    if (resetStreak) state.progress.currentStreak = 0;
    state.session.view = 'results';
    return state;
  });
}

function renderResults(state) {
  const level = LEVELS.find((item) => item.id === state.session.activeLevel);
  const gained = state.progress.score - (state.session.levelStartScore ?? 0);
  const states = level.concepts.map((id) => state.mastery[id]?.masteryState ?? 'introduced');
  main.innerHTML = `
    <section class="tutorial">
      <div class="panel tutorial-stage">
        <div class="eyebrow">Level complete</div>
        <h2>${escapeHtml(level.title)}</h2>
        <p class="lede">You earned <strong>${gained} points</strong>. Shape intuition grows through varied contexts, so replay is useful even after completion.</p>
        <div class="dashboard-grid">
          <div class="card metric-card"><div class="metric-value">${state.progress.currentStreak}</div><div>Current streak</div></div>
          <div class="card metric-card"><div class="metric-value">${states.filter((x) => x === 'mastered').length}/${states.length}</div><div>Level concepts mastered</div></div>
          <div class="card metric-card"><div class="metric-value">${masteryPercent(state.mastery)}%</div><div>Overall mastery</div></div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="button" data-action="open-map">Return to map</button>
          <button class="btn" type="button" data-action="start-level" data-level="${level.id}">Replay level</button>
        </div>
      </div>
    </section>`;
}

function renderProgress(state) {
  const totalConcepts = Object.keys(CONCEPT_LABELS).length;
  const masteryRows = Object.entries(CONCEPT_LABELS).map(([id, label]) => {
    const data = state.mastery[id];
    const status = data?.masteryState ?? 'not-introduced';
    const accuracy = data?.attempts ? Math.round((data.correct / data.attempts) * 100) : 0;
    const statusPct = { 'not-introduced': 0, introduced: 20, practising: 45, 'needs-review': 35, proficient: 75, mastered: 100 }[status] ?? 0;
    return `<div class="mastery-row"><strong>${escapeHtml(label)}</strong><div class="progress-track"><div class="progress-fill" style="width:${statusPct}%"></div></div><span>${status.replace('-', ' ')} · ${accuracy}%</span></div>`;
  }).join('');
  const topMisconception = Object.entries(state.misconceptions).sort((a,b) => b[1]-a[1])[0];
  const accuracy = state.progress.totalAttempts ? Math.round((state.progress.correctAttempts / state.progress.totalAttempts) * 100) : 0;
  main.innerHTML = `
    <section>
      <header class="page-header"><div><div class="eyebrow">Progress dashboard</div><h2>Your shape intuition</h2><p>Mastery combines repeated accuracy, first-attempt success, and performance across different contexts.</p></div><button class="btn" type="button" data-action="open-map">Learning map</button></header>
      <div class="dashboard-grid">
        <div class="card metric-card"><div class="metric-value">${masteryPercent(state.mastery)}%</div><div>Overall mastery</div></div>
        <div class="card metric-card"><div class="metric-value">${state.progress.totalRounds}</div><div>Rounds completed</div></div>
        <div class="card metric-card"><div class="metric-value">${accuracy}%</div><div>Answer accuracy</div></div>
        <div class="card metric-card"><div class="metric-value">${state.progress.completedLevels.length}/${LEVELS.length}</div><div>Levels completed</div></div>
      </div>
      <div class="panel" style="padding:1rem;margin-top:1rem"><h3>Recommended focus</h3><p>${topMisconception ? recommendationFor(topMisconception[0]) : 'Complete a few rounds to receive a targeted recommendation.'}</p></div>
      <div class="panel" style="padding:1rem;margin-top:1rem"><h3>Concept mastery (${Object.keys(state.mastery).length}/${totalConcepts} introduced)</h3><div class="mastery-list">${masteryRows}</div></div>
    </section>`;
}

function recommendationFor(id) {
  const map = {
    'reversed-jacobian': 'Practise rectangular Jacobians. Say “outputs first, inputs second” before entering dimensions.',
    'gradient-orientation': 'Review vector-to-scalar gradients and transpose traps under numerator layout.',
    'every-derivative-scalar': 'Review Levels 3–5 and count components rather than reading derivative notation as an ordinary fraction.',
    'inner-dimension-mistake': 'Replay Chain-Rule Builder and focus on matching inner dimensions.',
    'reasoning-rule': 'Use the two-part verbal proof: outputs give rows; inputs give columns.'
  };
  return map[id] ?? 'Replay the most recent level and use the visual Jacobian proof after each answer.';
}

function renderNotebook() {
  const entries = NOTEBOOK_ENTRIES.map((entry) => `
    <article class="card notebook-card">
      <h3>${escapeHtml(entry.title)}</h3>
      ${latex(entry.latex)}
      ${latex(entry.derivative)}
      <div class="shape-summary">${escapeHtml(entry.shape)}</div>
      <p>${escapeHtml(entry.explanation)}</p>
    </article>`).join('');
  main.innerHTML = `
    <section>
      <header class="page-header"><div><div class="eyebrow">Concept notebook</div><h2>The four derivative families</h2><p>Numerator layout is used consistently throughout the game.</p></div><button class="btn" type="button" data-action="open-map">Learning map</button></header>
      <div class="notebook-grid">${entries}</div>
    </section>`;
}

function syncInputs() {
  const rows = document.querySelector('#rows');
  const columns = document.querySelector('#columns');
  if (rows) roundState.rows = rows.value;
  if (columns) roundState.columns = columns.value;
}

function selectShape(category) {
  syncInputs();
  roundState.category = category;
  render();
}

function toggleReason(id) {
  syncInputs();
  roundState.reasons = roundState.reasons.includes(id) ? roundState.reasons.filter((value) => value !== id) : [...roundState.reasons, id];
  render();
}

function showHint() {
  const q = currentQuestion(getState());
  if (!q || roundState.hintsUsed >= q.hints.length) return;
  syncInputs();
  roundState.visibleHints.push(q.hints[roundState.hintsUsed]);
  roundState.hintsUsed += 1;
  announce(roundState.visibleHints.at(-1));
  render();
}

function attachDragAndDrop() {
  const card = document.querySelector('.derivative-card[draggable="true"]');
  if (!card) return;
  card.addEventListener('dragstart', (event) => {
    card.setAttribute('aria-grabbed', 'true');
    event.dataTransfer.setData('text/plain', 'derivative-card');
  });
  card.addEventListener('dragend', () => card.setAttribute('aria-grabbed', 'false'));
  document.querySelectorAll('.shape-bin').forEach((bin) => {
    bin.addEventListener('dragover', (event) => { event.preventDefault(); bin.classList.add('drag-over'); });
    bin.addEventListener('dragleave', () => bin.classList.remove('drag-over'));
    bin.addEventListener('drop', (event) => {
      event.preventDefault();
      bin.classList.remove('drag-over');
      selectShape(bin.dataset.category);
    });
  });
}

function openSettings() {
  const state = getState();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings and progress</h2>
      <div class="settings-grid">
        <label class="setting-row"><span>Reduce motion</span><input id="setting-motion" type="checkbox" ${state.settings.reducedMotion ? 'checked' : ''}></label>
        <label class="setting-row"><span>Font scale</span><input id="setting-font" type="range" min="0.9" max="1.3" step="0.1" value="${state.settings.fontScale}"></label>
        <label class="setting-row"><span>Optional sounds</span><input id="setting-sound" type="checkbox" ${state.settings.soundEnabled ? 'checked' : ''}></label>
        <div class="actions">
          <button class="btn" type="button" data-modal-action="export">Export progress</button>
          <label class="btn" for="import-file">Import progress<input class="sr-only" id="import-file" type="file" accept="application/json"></label>
          <button class="btn btn-danger" type="button" data-modal-action="reset">Reset progress</button>
        </div>
        <div class="actions"><button class="btn btn-primary" type="button" data-modal-action="save">Save settings</button><button class="btn" type="button" data-modal-action="close">Close</button></div>
      </div>
    </section>`;
  document.body.append(backdrop);
  backdrop.querySelector('[data-modal-action="close"]').focus();
  backdrop.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-modal-action]')?.dataset.modalAction;
    if (!action) return;
    if (action === 'close') backdrop.remove();
    if (action === 'save') {
      setState((next) => {
        next.settings.reducedMotion = backdrop.querySelector('#setting-motion').checked;
        next.settings.fontScale = Number(backdrop.querySelector('#setting-font').value);
        next.settings.soundEnabled = backdrop.querySelector('#setting-sound').checked;
        return next;
      });
      backdrop.remove();
    }
    if (action === 'export') downloadProgress(exportState(getState()));
    if (action === 'reset' && window.confirm('Reset all Shape Sorter progress?')) {
      clearState(); resetInMemory(); backdrop.remove();
    }
  });
  backdrop.querySelector('#import-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const next = importState(await file.text(), DEFAULT_STATE);
      saveState(next);
      setState(next);
      backdrop.remove();
      announce('Progress imported.');
    } catch (error) {
      window.alert(error.message);
    }
  });
}

function downloadProgress(raw) {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'shape-sorter-progress.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

main.addEventListener('input', (event) => {
  if (event.target.id === 'rows') roundState.rows = event.target.value;
  if (event.target.id === 'columns') roundState.columns = event.target.value;
});

main.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action], [data-nav]');
  if (!target) return;
  const nav = target.dataset.nav;
  const action = target.dataset.action;
  if (nav) return navigate(nav);
  if (action === 'start-tutorial') { tutorialStep = 0; navigate('tutorial'); }
  else if (action === 'tutorial-next') {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) { tutorialStep += 1; render(); }
    else setState((state) => { state.progress.tutorialComplete = true; state.session.view = 'map'; return state; });
  }
  else if (action === 'tutorial-back') { tutorialStep = Math.max(0, tutorialStep - 1); render(); }
  else if (action === 'open-map') navigate('map');
  else if (action === 'continue') {
    const state = getState();
    if (state.session.activeLevel && state.session.seed && !state.progress.completedLevels.includes(state.session.activeLevel)) navigate('game');
    else navigate('map');
  }
  else if (action === 'start-level') startLevel(Number(target.dataset.level));
  else if (action === 'select-shape') selectShape(target.dataset.category);
  else if (action === 'toggle-reason') toggleReason(target.dataset.reason);
  else if (action === 'choose-validity') { roundState.validity = target.dataset.validity === 'true'; render(); }
  else if (action === 'hint') showHint();
  else if (action === 'check') submitAnswer();
  else if (action === 'skip-round') skipRound();
  else if (action === 'retry') { roundState.feedback = null; render(); }
  else if (action === 'reset-round') { roundState = freshRoundState(); render(); }
  else if (action === 'next-round') nextRound();
});

document.querySelector('.topbar').addEventListener('click', (event) => {
  const target = event.target.closest('[data-action], [data-nav]');
  if (!target) return;
  if (target.dataset.nav) navigate(target.dataset.nav);
  if (target.dataset.action === 'home') navigate('welcome');
  if (target.dataset.action === 'settings') openSettings();
});

subscribe(render);
render();
