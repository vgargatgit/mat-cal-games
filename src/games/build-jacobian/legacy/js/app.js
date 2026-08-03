import { AppState } from './state.js';
import { LEVELS, STAGE_LABELS } from './data/levels.js';
import { CONCEPTS } from './data/concepts.js';
import { getRoundsForLevel, getRoundById } from './data/rounds.js';
import { generateRound } from './engine/generator.js';
import { GameEngine, classificationOptions } from './engine/game-engine.js';
import { recommendedReview, mostCommonMisconception } from './engine/mastery.js';
import { exportStore, importStore } from './storage.js';
import { applySettings, announce } from './accessibility.js';
import { renderMath } from './math-renderer.js';
import { h, clear, button, field } from './components/dom.js';
import { equation } from './components/equation.js';
import { renderMatrixGrid } from './components/matrix-grid.js';
import { renderDependencyEditor, dependencyDescription } from './components/dependency-map.js';
import { c, toLatex, toPlain } from './math/ast.js';
import { derivativeSteps } from './math/derivative.js';
import { isZeroExpression } from './math/jacobian.js';

const root = document.getElementById('app');
const appState = new AppState();
let currentView = 'welcome';
let currentRound = null;
let engine = null;
let tutorialStep = 0;
let tileMap = new Map();

const TUTORIAL_STEPS = [
  {
    title: '1. Meet the function',
    text: 'This vector-valued function has two input components and two scalar output components.',
    latex: '\\mathbf{f}(x_1,x_2)=\\begin{bmatrix}x_1^2+x_2\\\\x_1x_2\\end{bmatrix}',
    visual: ['inputs: x₁, x₂', 'outputs: f₁, f₂'],
  },
  {
    title: '2. Predict the shape',
    text: 'Rows count outputs. Columns count inputs. Two outputs and two inputs produce a 2×2 Jacobian.',
    latex: 'J\\in\\mathbb{R}^{2\\times2}', visual: ['2 output rows', '2 input columns'],
  },
  {
    title: '3. Label the rows',
    text: 'Every row belongs to one scalar output component.',
    latex: '\\text{row 1}\\to f_1,\\qquad \\text{row 2}\\to f_2', visual: ['row 1: f₁', 'row 2: f₂'],
  },
  {
    title: '4. Label the columns',
    text: 'Every column belongs to one independent input component.',
    latex: '\\text{column 1}\\to x_1,\\qquad \\text{column 2}\\to x_2', visual: ['column 1: x₁', 'column 2: x₂'],
  },
  {
    title: '5. Interpret one cell',
    text: 'Row 2, column 1 asks how output f₂ responds when input x₁ changes while x₂ is held fixed.',
    latex: 'J_{21}=\\frac{\\partial f_2}{\\partial x_1}', visual: ['selected output: f₂', 'active input: x₁', 'frozen input: x₂'],
  },
  {
    title: '6. Calculate the cell',
    text: 'Since f₂=x₁x₂ and x₂ is frozen, the derivative with respect to x₁ is x₂.',
    latex: '\\frac{\\partial(x_1x_2)}{\\partial x_1}=x_2', visual: ['tile x₂', 'place at row 2, column 1'],
  },
  {
    title: '7. Complete the matrix',
    text: 'A Jacobian is built one Partial Derivative Freeze action at a time.',
    latex: '\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}=\\begin{bmatrix}2x_1&1\\\\x_2&x_1\\end{bmatrix}',
    visual: ['one output per row', 'one input per column', 'one sensitivity per cell'],
  },
];

function init() {
  applySettings(appState.settings);
  document.querySelectorAll('[data-view]').forEach(control => {
    control.addEventListener('click', () => navigate(control.dataset.view));
  });
  window.addEventListener('load', () => renderMath(document.body));
  render();
}

function navigate(view) {
  currentView = view;
  if (view !== 'game') {
    currentRound = null;
    engine = null;
  }
  render();
  root.focus({ preventScroll: true });
}

function render() {
  clear(root);
  updateNavigation();
  switch (currentView) {
    case 'levels': root.append(renderLevels()); break;
    case 'notebook': root.append(renderNotebook()); break;
    case 'progress': root.append(renderProgress()); break;
    case 'settings': root.append(renderSettings()); break;
    case 'tutorial': root.append(renderTutorial()); break;
    case 'game': root.append(renderGame()); break;
    default: root.append(renderWelcome());
  }
  renderMath(root);
}

function updateNavigation() {
  document.querySelectorAll('[data-view]').forEach(control => {
    const active = control.dataset.view === currentView || (currentView === 'tutorial' && control.dataset.view === 'welcome');
    if (active) control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  });
}

function renderWelcome() {
  const game = appState.game;
  const progress = game.progress;
  const continueAvailable = Boolean(game.currentRound);
  const review = recommendedReview(game);
  return h('section', { className: 'view', 'aria-labelledby': 'welcome-title' }, [
    h('div', { className: 'hero' }, [
      h('article', { className: 'card hero-copy' }, [
        h('p', { className: 'eyebrow', text: 'Matrix Calculus Game 3' }),
        h('h1', { id: 'welcome-title', text: 'Build the Jacobian' }),
        h('p', { className: 'lead', text: 'One output row. One input column. One local sensitivity per cell.' }),
        h('p', { className: 'muted', text: 'Choose an output, choose an input, freeze the other independent variables, calculate one partial derivative, and place it where the row and column meet.' }),
        h('div', { className: 'actions' }, [
          button(continueAvailable ? 'Continue current round' : game.tutorialCompleted ? 'Start next level' : 'Start tutorial', {
            primary: true,
            onClick: () => continueAvailable ? continueRound() : game.tutorialCompleted ? startLevel(progress.currentLevel) : openTutorial(),
          }),
          button('Explore levels', { onClick: () => { currentView = 'levels'; render(); } }),
          button('Replay tutorial', { onClick: openTutorial }),
        ]),
      ]),
      h('aside', { className: 'card control-board', 'aria-label': 'Current mastery' }, [
        h('div', {}, [h('p', { className: 'eyebrow', text: 'Sensitivity control room' }), h('h2', { text: `${appState.masteryPercent}% mastery` })]),
        h('div', { className: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(appState.masteryPercent) }, h('span', { style: { width: `${appState.masteryPercent}%` } })),
        h('div', { className: 'stat-grid' }, [
          stat('Rounds', progress.roundsCompleted),
          stat('Score', progress.totalScore),
          stat('Levels', `${progress.completedLevels.length}/14`),
          stat('First-try rounds', progress.firstAttemptCorrect),
        ]),
        h('div', { className: 'feedback' }, [h('strong', { text: 'Recommended review' }), h('p', { text: review.text }), button(`Open level ${review.level}`, { small: true, onClick: () => startLevel(review.level) })]),
      ]),
    ]),
    h('section', { className: 'card' }, [
      h('p', { className: 'eyebrow', text: 'Numerator layout' }),
      h('h2', { text: 'Outputs define rows. Inputs define columns.' }),
      equation('\\mathbf{f}:\\mathbb{R}^{n}\\rightarrow\\mathbb{R}^{m}\\quad\\Longrightarrow\\quad J=\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{m\\times n}', { block: true, label: 'A function from R n to R m has an m by n Jacobian in numerator layout.' }),
      h('p', { className: 'muted', text: 'Some books use the transpose convention. This game always names the convention and diagnoses a transposed answer instead of treating it as meaningless.' }),
    ]),
  ]);
}

function stat(label, value) {
  return h('div', { className: 'stat' }, [h('strong', { text: value }), h('span', { className: 'muted', text: label })]);
}

function openTutorial() {
  tutorialStep = 0;
  currentView = 'tutorial';
  render();
}

function renderTutorial() {
  const step = TUTORIAL_STEPS[tutorialStep];
  return h('section', { className: 'view', 'aria-labelledby': 'tutorial-title' }, [
    h('article', { className: 'card stage-card' }, [
      h('p', { className: 'eyebrow', text: `Interactive tutorial ${tutorialStep + 1} of ${TUTORIAL_STEPS.length}` }),
      h('h1', { id: 'tutorial-title', text: step.title }),
      h('p', { className: 'lead', text: step.text }),
      equation(step.latex, { block: true }),
      h('div', { className: 'tutorial-art' }, step.visual.map(item => h('div', { className: 'tutorial-node', text: item }))),
      h('div', { className: 'meter', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(TUTORIAL_STEPS.length), 'aria-valuenow': String(tutorialStep + 1) }, h('span', { style: { width: `${((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%` } })),
      h('div', { className: 'actions' }, [
        button('Back', { disabled: tutorialStep === 0, onClick: () => { tutorialStep -= 1; render(); } }),
        button(tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Enter the control room' : 'Next', {
          primary: true,
          onClick: () => {
            if (tutorialStep < TUTORIAL_STEPS.length - 1) { tutorialStep += 1; render(); }
            else { appState.markTutorialComplete(); startLevel(1); }
          },
        }),
        button('Exit tutorial', { onClick: () => { currentView = 'welcome'; render(); } }),
      ]),
    ]),
  ]);
}

function renderLevels() {
  const completed = new Set(appState.game.progress.completedLevels);
  return h('section', { className: 'view', 'aria-labelledby': 'levels-title' }, [
    h('div', { className: 'card' }, [h('p', { className: 'eyebrow', text: 'Progressive lab' }), h('h1', { id: 'levels-title', text: 'Fourteen Jacobian levels' }), h('p', { className: 'muted', text: 'Each level includes a deterministic teaching round. Levels with multiple exact samples continue through those samples before generated practice.' })]),
    h('div', { className: 'level-grid' }, LEVELS.map(level => {
      const isComplete = completed.has(level.id);
      const staticRounds = getRoundsForLevel(level.id);
      return h('article', { className: 'card level-card' }, [
        h('header', {}, [h('div', {}, [h('p', { className: 'eyebrow', text: `Level ${level.id}` }), h('h2', { text: level.title })]), h('span', { className: 'level-badge', text: isComplete ? 'Completed' : 'Ready' })]),
        h('p', { text: level.objective }),
        h('div', { className: 'concept-tags' }, level.focus.map(focus => h('span', { className: 'tag', text: focus.replaceAll('-', ' ') }))),
        h('p', { className: 'muted', text: `${staticRounds.length || 1} deterministic round${staticRounds.length === 1 ? '' : 's'} available` }),
        h('div', { className: 'actions' }, [
          button(isComplete ? 'Replay level' : 'Start level', { primary: true, onClick: () => startLevel(level.id) }),
          button('Generated practice', { onClick: () => startGenerated(level.id) }),
        ]),
      ]);
    })),
  ]);
}

function startLevel(level) {
  const rounds = getRoundsForLevel(level);
  const completedIds = new Set(appState.game.progress.completedRoundIds || []);
  const round = rounds.find(candidate => !completedIds.has(candidate.id)) || rounds[0] || generateRound(level, Date.now());
  startRound(round);
}

function startGenerated(level) {
  startRound(generateRound(level, Date.now()));
}

function continueRound() {
  const saved = appState.game.currentRound;
  if (!saved) { startLevel(appState.game.progress.currentLevel); return; }
  const round = saved.generated ? generateRound(saved.level, saved.seed, saved.family) : getRoundById(saved.id);
  if (!round) { appState.clearCurrentRound(); startLevel(saved.level || 1); return; }
  startRound(round, saved.engineState);
}

function startRound(round, restored = null) {
  currentRound = round;
  engine = new GameEngine(round, restored);
  currentView = 'game';
  appState.saveCurrentRound(round, engine);
  render();
  announce(`Started ${round.title}.`);
}

function renderGame() {
  if (!currentRound || !engine) return h('section', { className: 'card' }, [h('h1', { text: 'No active round' }), button('Return to levels', { onClick: () => { currentView = 'levels'; render(); } })]);
  if (engine.isComplete && !engine.state.finalized) appState.completeRound(currentRound, engine);
  const stage = engine.currentStage;
  return h('section', { className: 'view game-shell', 'aria-labelledby': 'round-title' }, [
    h('div', { className: 'game-top' }, [
      h('div', {}, [h('p', { className: 'eyebrow', text: `Level ${currentRound.level} · ${currentRound.difficulty}` }), h('h1', { id: 'round-title', text: currentRound.title })]),
      h('div', { className: 'actions' }, [button('Save & exit', { onClick: () => { appState.saveCurrentRound(currentRound, engine); currentView = 'levels'; currentRound = null; engine = null; render(); } })]),
    ]),
    renderFunctionCard(currentRound),
    h('div', { className: 'stage-list', 'aria-label': 'Round stages' }, engine.stages.map((name, index) => h('span', {
      className: `stage-pill${index === engine.state.stageIndex ? ' current' : ''}${engine.state.completedStages.includes(name) ? ' done' : ''}`,
      text: STAGE_LABELS[name],
    }))),
    renderFeedback(engine.state.feedback),
    renderStage(stage),
  ]);
}

function renderFunctionCard(round) {
  const vectorName = round.outputs[0]?.name?.split('_')[0] || 'f';
  const components = round.outputs.map(output => toLatex(output.expression)).join('\\\\');
  const inputs = round.inputs.map(name => latexName(name)).join(',');
  const children = [
    h('div', {}, [h('p', { className: 'eyebrow', text: 'Vector-valued function' }), equation(`\\mathbf{${vectorName}}(${inputs})=\\begin{bmatrix}${components}\\end{bmatrix}`, { block: true })]),
    h('div', { className: 'function-components' }, round.outputs.map((output, index) => h('div', { className: 'function-component' }, [
      h('span', { className: 'gauge-icon', 'aria-hidden': 'true', text: String(index + 1) }),
      equation(`${latexName(output.name)}=${toLatex(output.expression)}`, { label: `${output.name} equals ${toPlain(output.expression)}` }),
      output.description ? h('span', { className: 'muted', text: output.description }) : null,
    ]))),
  ];
  if (round.point) children.push(h('div', { className: 'feedback warning' }, [h('strong', { text: 'Evaluate at ' }), equation(pointLatex(round.point)), h('p', { className: 'muted', text: 'A zero value here may still have a structural dependency path.' })]));
  if (round.note) children.push(h('p', { className: 'muted', text: round.note }));
  return h('article', { className: 'card math-card' }, children);
}

function renderFeedback(feedback) {
  if (!feedback) return h('div', { className: 'feedback', hidden: true });
  return h('div', { className: `feedback ${feedback.type || ''}`, role: feedback.type === 'bad' ? 'alert' : 'status' }, [h('strong', { text: feedback.type === 'good' ? 'Control board calibrated. ' : feedback.type === 'bad' ? 'Check the wiring. ' : 'Hint. ' }), h('span', { text: feedback.text })]);
}

function renderStage(stage) {
  switch (stage) {
    case 'shape': return renderShapeStage();
    case 'labels': return renderLabelsStage();
    case 'locate': return renderLocateStage();
    case 'dependencies': return renderDependenciesStage();
    case 'build': return renderBuildStage();
    case 'classify': return renderClassificationStage();
    case 'interpret': return renderInterpretStage();
    case 'complete': return renderCompleteStage();
    default: return h('article', { className: 'card', text: 'Unknown stage.' });
  }
}

function renderShapeStage() {
  const rowsInput = h('input', { type: 'number', min: 1, max: 4, required: true, value: engine.state.shape.rows || '' });
  const columnsInput = h('input', { type: 'number', min: 1, max: 4, required: true, value: engine.state.shape.columns || '' });
  const form = h('form', { className: 'shape-form', onSubmit: event => {
    event.preventDefault();
    handleResult(engine.validateShape(rowsInput.value, columnsInput.value), 'shape');
  } }, [
    field('Rows', rowsInput, 'number of scalar outputs'),
    h('span', { className: 'times', 'aria-hidden': 'true', text: '×' }),
    field('Columns', columnsInput, 'number of independent inputs'),
    h('button', { type: 'submit', className: 'btn primary', text: 'Lock shape' }),
  ]);
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Reuse Shape Sorter' }), h('h2', { text: 'Predict the Jacobian shape' }),
    h('p', { text: 'Under numerator layout, the first dimension counts output components and the second counts input components.' }),
    form,
    equation('\\text{Jacobian shape}=\\text{outputs}\\times\\text{inputs}', { block: true }),
  ]);
}

function renderLabelsStage() {
  if (currentRound.mode === 'rows-only' && engine.state.columnLabels.every(label => !label)) engine.state.columnLabels = [...currentRound.inputs];
  if (currentRound.mode === 'columns-only' && engine.state.rowLabels.every(label => !label)) engine.state.rowLabels = currentRound.outputs.map(output => output.name);
  const allOptions = ['', ...currentRound.outputs.map(output => output.name), ...currentRound.inputs];
  const makeSelect = (value, onChange, label) => {
    const select = h('select', { value, 'aria-label': label, onChange: event => onChange(event.target.value) });
    allOptions.forEach(option => select.append(h('option', { value: option, text: option || 'Choose label' })));
    return select;
  };
  const rowControls = currentRound.outputs.map((output, index) => h('div', { className: 'label-row' }, [
    h('span', { className: 'gauge-icon', 'aria-hidden': 'true', text: String(index + 1) }),
    currentRound.mode === 'columns-only'
      ? h('strong', { text: engine.state.rowLabels[index] })
      : makeSelect(engine.state.rowLabels[index], value => { engine.state.rowLabels[index] = value; }, `Label for row ${index + 1}`),
  ]));
  const columnControls = currentRound.inputs.map((input, index) => h('div', { className: 'label-row' }, [
    h('span', { className: 'knob-icon', 'aria-hidden': 'true', text: String(index + 1) }),
    currentRound.mode === 'rows-only'
      ? h('strong', { text: engine.state.columnLabels[index] })
      : makeSelect(engine.state.columnLabels[index], value => { engine.state.columnLabels[index] = value; }, `Label for column ${index + 1}`),
  ]));
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Permanent orientation labels' }), h('h2', { text: 'Label rows and columns' }),
    h('p', { text: 'The grid is never anonymous: outputs stay on the left, inputs stay across the top.' }),
    h('div', { className: 'label-builder' }, [
      h('div', { className: 'label-column' }, [h('h3', { text: 'Output rows' }), ...rowControls]),
      h('div', { className: 'label-column' }, [h('h3', { text: 'Input columns' }), ...columnControls]),
    ]),
    h('div', { className: 'actions' }, [button('Validate labels', { primary: true, onClick: () => handleResult(engine.validateLabels(engine.state.rowLabels, engine.state.columnLabels), 'labels') })]),
  ]);
}

function renderLocateStage() {
  const target = currentRound.targetCell;
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Read row first, column second' }),
    h('h2', { text: `Find row ${target.row + 1}, column ${target.column + 1}` }),
    equation(`J_{${target.row + 1}${target.column + 1}}=\\frac{\\partial ${latexName(currentRound.outputs[target.row].name)}}{\\partial ${latexName(currentRound.inputs[target.column])}}`, { block: true }),
    renderMatrixGrid({ round: currentRound, engine, locateMode: true, onCellSelect: (row, column) => handleResult(engine.validateLocatedCell(row, column), 'locate') }),
  ]);
}

function renderDependenciesStage() {
  const toggle = (row, column, value) => {
    engine.state.dependencies[row][column] = value;
    appState.saveCurrentRound(currentRound, engine);
    render();
    announce(`${currentRound.inputs[column]} to ${currentRound.outputs[row].name}: ${value ? 'path exists' : 'no path'}.`);
  };
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Dependency draw mode' }), h('h2', { text: 'Wire input knobs to output gauges' }),
    h('p', { text: 'A missing path predicts a structural zero before any derivative calculation. A present path can still have slope zero at a particular evaluation point.' }),
    renderDependencyEditor(currentRound, engine.state.dependencies, toggle),
    h('div', { className: 'actions' }, [
      button('Check dependency map', { primary: true, onClick: () => handleResult(engine.validateDependencies(engine.state.dependencies), 'dependencies') }),
      button('Dependency hint', { onClick: dependencyHint }),
    ]),
  ]);
}

function dependencyHint() {
  engine.useHint('dependencies');
  const mismatch = [];
  currentRound.dependencyMatrix.forEach((row, i) => row.forEach((expected, j) => {
    if (engine.state.dependencies[i][j] !== expected) mismatch.push({ row: i, column: j, expected });
  }));
  const first = mismatch[0];
  engine.state.feedback = first
    ? { type: 'warning', text: `Inspect ${currentRound.outputs[first.row].name}. Does ${currentRound.inputs[first.column]} appear in that scalar expression?` }
    : { type: 'good', text: 'Your current dependency map matches the expression structure.' };
  appState.saveCurrentRound(currentRound, engine);
  render();
}

function renderBuildStage() {
  tileMap = new Map();
  const grid = renderMatrixGrid({
    round: currentRound, engine,
    onCellSelect: (row, column) => { engine.state.selectedCell = { row, column }; appState.saveCurrentRound(currentRound, engine); render(); },
    onDrop: (tileId, row, column) => placeTile(tileId, row, column),
  });
  const selected = engine.state.selectedCell;
  const tiles = engine.derivativeTiles();
  const tray = h('div', { className: 'tile-tray', role: 'list', 'aria-label': 'Derivative tile tray' }, tiles.map(tile => {
    tileMap.set(tile.id, tile.ast);
    return h('button', {
      type: 'button', className: `derivative-tile${engine.state.selectedTile === tile.id ? ' selected' : ''}`,
      role: 'listitem', draggable: true, 'aria-pressed': engine.state.selectedTile === tile.id ? 'true' : 'false',
      onClick: () => selectOrPlaceTile(tile.id),
      onDragstart: event => event.dataTransfer.setData('text/plain', tile.id),
    }, equation(tile.latex));
  }));
  const workbench = renderWorkbench(selected);
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: currentRound.mode === 'repair' ? 'Matrix repair mode' : 'Partial Derivative Freeze × Jacobian assembly' }),
    h('h2', { text: currentRound.mode === 'repair' ? 'Repair the incorrect Jacobian' : 'Calculate and place every active cell' }),
    h('p', { text: 'Select a matrix cell, then choose a derivative tile to place it immediately. Repeat until every active cell is filled, then validate the Jacobian.' }),
    h('div', { className: 'board-layout' }, [h('div', {}, [grid, h('h3', { text: 'Derivative tile tray' }), tray]), workbench]),
    h('div', { className: 'actions' }, [button(currentRound.mode === 'repair' ? 'Validate repaired matrix' : 'Validate Jacobian', { primary: true, onClick: () => handleResult(engine.validateMatrix(), 'build') }), button('Reset active cells', { onClick: resetActiveCells })]),
  ]);
}

function renderWorkbench(selected) {
  if (!selected) return h('aside', { className: 'workbench card' }, [h('h3', { text: 'Cell workbench' }), h('p', { className: 'muted', text: 'Select a matrix cell. The intersecting output row and input column will become active.' })]);
  const { row, column } = selected;
  const output = currentRound.outputs[row];
  const input = currentRound.inputs[column];
  const frozen = currentRound.inputs.filter((_, index) => index !== column);
  const typedInput = h('input', { type: 'text', placeholder: 'e.g. 2x_1 or x_1+x_1', autocomplete: 'off', 'aria-label': 'Equivalent derivative expression' });
  const hintCount = engine.state.hintsUsed.build || 0;
  const children = [
    h('h3', { text: 'Cell workbench' }),
    h('div', { className: 'readout' }, [h('strong', { text: `Row ${row + 1}, column ${column + 1}` }), equation(`\\frac{\\partial ${latexName(output.name)}}{\\partial ${latexName(input)}}`, { block: true })]),
    h('div', { className: 'readout' }, [h('span', { className: 'muted', text: 'Selected output' }), equation(`${latexName(output.name)}=${toLatex(output.expression)}`, { block: true })]),
    h('div', { className: 'readout' }, [h('span', { className: 'muted', text: 'Active input' }), h('strong', { text: input }), h('p', { className: 'muted', text: frozen.length ? `Frozen independent inputs: ${frozen.join(', ')}` : 'No other independent input is present.' })]),
    h('div', { className: 'actions' }, [
      button('Place selected tile', { primary: true, disabled: !engine.state.selectedTile, onClick: () => placeTile(engine.state.selectedTile, row, column) }),
      button('Mark zero', { onClick: () => placeAst(row, column, c(0)) }),
      button('Clear cell', { onClick: () => { engine.clearCell(row, column); appState.saveCurrentRound(currentRound, engine); render(); } }),
    ]),
    field('Enter an equivalent expression', typedInput, 'Safe parser: numbers, variables, +, −, *, powers, sin(), cos(), exp(), relu().'),
    button('Apply typed derivative to this cell', { onClick: () => {
      const result = engine.placeText(row, column, typedInput.value);
      if (!result.ok) { engine.state.feedback = { type: 'bad', text: result.error }; render(); }
      else { engine.state.feedback = { type: 'good', text: `Placed ${typedInput.value} in row ${row + 1}, column ${column + 1}.` }; appState.saveCurrentRound(currentRound, engine); render(); }
    } }),
    button('Progressive hint', { onClick: buildHint }),
  ];
  if (hintCount > 0) children.push(h('p', { className: 'feedback warning', text: hintText(hintCount, row, column) }));
  return h('aside', { className: 'workbench' }, children);
}

function selectOrPlaceTile(tileId) {
  engine.state.selectedTile = tileId;
  const selected = engine.state.selectedCell;
  if (selected) {
    placeTile(tileId, selected.row, selected.column);
    return;
  }
  engine.state.feedback = { type: 'warning', text: 'Derivative selected. Now choose an active matrix cell to place it.' };
  appState.saveCurrentRound(currentRound, engine);
  render();
}

function placeTile(tileId, row, column) {
  const ast = tileMap.get(tileId) || engine.derivativeTiles().find(tile => tile.id === tileId)?.ast;
  if (!ast) return;
  placeAst(row, column, ast);
}

function placeAst(row, column, ast) {
  const result = engine.placeAst(row, column, ast);
  if (!result.ok) { engine.state.feedback = { type: 'bad', text: result.error }; }
  else {
    engine.state.selectedCell = { row, column };
    engine.state.feedback = { type: 'good', text: `Placed ${toPlain(ast)} in row ${row + 1}, column ${column + 1}.` };
    announce(`Placed ${toPlain(ast)} in row ${row + 1}, column ${column + 1}.`);
  }
  appState.saveCurrentRound(currentRound, engine);
  render();
}

function resetActiveCells() {
  engine.activeCells().forEach(({ row, column }) => engine.clearCell(row, column));
  engine.state.feedback = { type: 'warning', text: 'Active cells were cleared. Row and column labels remain fixed.' };
  appState.saveCurrentRound(currentRound, engine);
  render();
}

function buildHint() {
  engine.useHint('build');
  engine.state.feedback = { type: 'warning', text: hintText(engine.state.hintsUsed.build, engine.state.selectedCell?.row ?? 0, engine.state.selectedCell?.column ?? 0) };
  appState.saveCurrentRound(currentRound, engine);
  render();
}

function hintText(count, row, column) {
  const output = currentRound.outputs[row];
  const input = currentRound.inputs[column];
  if (count === 1) return `Read the row first and column second: differentiate ${output.name} with respect to ${input}.`;
  if (count === 2) return `Isolate ${output.name}=${toPlain(output.expression)}. Ignore the other output components.`;
  if (count === 3) return `Keep ${input} active and hold ${currentRound.inputs.filter(name => name !== input).join(', ') || 'all other inputs'} fixed.`;
  const steps = derivativeSteps(output.expression, input, currentRound.context || {});
  return `Use the ${steps.rule}. The symbolic derivative is ${toPlain(steps.result)}.`;
}

function renderClassificationStage() {
  const selected = new Set(engine.state.classification);
  const cards = classificationOptions().map(([value, title, description]) => {
    const checkbox = h('input', { type: 'checkbox', checked: selected.has(value), onChange: event => {
      if (event.target.checked) selected.add(value); else selected.delete(value);
      engine.state.classification = [...selected];
    } });
    return h('label', { className: 'check-card' }, [checkbox, h('span', {}, [h('strong', { text: title }), h('span', { className: 'muted', text: ` — ${description}` })])]);
  });
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Read structure from the completed board' }), h('h2', { text: 'Classify the Jacobian' }),
    h('p', { text: 'Select every description that applies. “Square” and “identity” are not synonyms; “zero here” and “no path” are not synonyms.' }),
    h('div', { className: 'classification-grid' }, cards),
    h('div', { className: 'actions' }, [button('Validate classification', { primary: true, onClick: () => handleResult(engine.validateClassification([...selected]), 'classify') })]),
  ]);
}

function renderInterpretStage() {
  const state = engine.state.interpretation;
  const outputSelect = selectControl(['', ...currentRound.outputs.map(output => output.name)], state.output, 'Choose an output', value => { state.output = value; render(); });
  const inputSelect = selectControl(['', ...currentRound.inputs], state.input, 'Choose an input', value => { state.input = value; render(); });
  const responseSelect = selectControl([
    ['', 'Choose the meaning'],
    ['output-responds-to-input', 'the selected output responds when the selected input changes'],
    ['input-responds-to-output', 'the selected input responds when the output changes'],
    ['whole-vector-only', 'the whole matrix has no individual cell meaning'],
  ], state.response, 'Choose cell meaning', value => { state.response = value; });
  let live = h('p', { className: 'muted', text: 'Choose one output row and one input column to inspect their intersection.' });
  if (state.output && state.input) {
    const row = currentRound.outputs.findIndex(output => output.name === state.output);
    const column = currentRound.inputs.indexOf(state.input);
    const symbolic = currentRound.symbolicJacobian[row][column];
    live = h('div', { className: 'feedback' }, [
      equation(`J_{${row + 1}${column + 1}}=\\frac{\\partial ${latexName(state.output)}}{\\partial ${latexName(state.input)}}=${toLatex(symbolic)}`, { block: true }),
      h('p', { text: `${state.output} is the row output; ${state.input} is the column input.` }),
      currentRound.point ? h('p', { className: 'muted', text: `At the selected point, this cell evaluates to ${toPlain(currentRound.expectedJacobian[row][column])}. Structural wiring remains determined by the original expression.` }) : null,
    ]);
  }
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Local transformation meaning' }), h('h2', { text: 'Interpret one row, one column, and one cell' }),
    h('div', { className: 'interpret-grid' }, [
      h('div', { className: 'interpret-card' }, [h('h3', { text: 'Output row' }), field('Selected output', outputSelect, 'A row is the gradient of this scalar output.')]),
      h('div', { className: 'interpret-card' }, [h('h3', { text: 'Input column' }), field('Selected input', inputSelect, 'A column collects every output response to this input.')]),
      h('div', { className: 'interpret-card' }, [h('h3', { text: 'Cell meaning' }), field('Complete the sentence', responseSelect)]),
    ]),
    live,
    h('div', { className: 'actions' }, [button('Validate interpretation', { primary: true, onClick: () => handleResult(engine.validateInterpretation(state.output, state.input, state.response), 'interpret') })]),
  ]);
}

function selectControl(options, value, label, onChange) {
  const select = h('select', { value, 'aria-label': label, onChange: event => onChange(event.target.value) });
  options.forEach(option => {
    const pair = Array.isArray(option) ? option : [option, option || label];
    select.append(h('option', { value: pair[0], text: pair[1] }));
  });
  return select;
}

function renderCompleteStage() {
  const classification = currentRound.classification;
  const labels = [classification.square ? 'square' : 'rectangular'];
  if (classification.identity) labels.push('identity');
  else if (classification.diagonal) labels.push('diagonal');
  if (classification.sparse) labels.push('sparse');
  if (classification.dense) labels.push('dense');
  if (classification.constant) labels.push('constant');
  if (classification.zeroRows.length) labels.push('zero row');
  if (classification.zeroColumns.length) labels.push('zero column');
  const firstCell = engine.state.selectedCell || { row: 0, column: 0 };
  const output = currentRound.outputs[firstCell.row];
  const input = currentRound.inputs[firstCell.column];
  const nextStatic = nextUncompletedRound(currentRound.level, currentRound.id);
  return h('article', { className: 'card stage-card' }, [
    h('p', { className: 'eyebrow', text: 'Assembly complete' }), h('h2', { text: `Round score: ${engine.state.score}` }),
    h('p', { text: `${currentRound.outputs.length} outputs prove ${currentRound.outputs.length} rows; ${currentRound.inputs.length} inputs prove ${currentRound.inputs.length} columns.` }),
    renderMatrixGrid({ round: currentRound, engine, readOnly: true, expected: true }),
    h('div', { className: 'stat-grid' }, [stat('Shape', `${currentRound.expectedShape.rows}×${currentRound.expectedShape.columns}`), stat('Structure', labels.join(', ')), stat('Dependency paths', currentRound.classification.structuralConnections), stat('Score', engine.state.score)]),
    h('div', { className: 'interpret-grid' }, [
      h('div', { className: 'interpret-card' }, [h('h3', { text: `Row ${firstCell.row + 1}` }), h('p', { text: `This row is the gradient of scalar output ${output.name} with respect to all inputs.` })]),
      h('div', { className: 'interpret-card' }, [h('h3', { text: `Column ${firstCell.column + 1}` }), h('p', { text: `This column describes how every output responds when ${input} changes.` })]),
      h('div', { className: 'interpret-card' }, [h('h3', { text: `Cell J${firstCell.row + 1}${firstCell.column + 1}` }), h('p', { text: `It measures the local sensitivity of ${output.name} to ${input}.` }), equation(toLatex(currentRound.symbolicJacobian[firstCell.row][firstCell.column]), { block: true })]),
    ]),
    h('div', { className: 'feedback' }, [h('strong', { text: 'Backpropagation connection' }), h('p', { text: 'This complete Jacobian can become one local derivative block in a chain-rule product. Shape compatibility determines how that block composes with neighboring local Jacobians.' })]),
    h('div', { className: 'actions' }, [
      nextStatic ? button('Next exact round', { primary: true, onClick: () => startRound(nextStatic) }) : button(`Continue to level ${Math.min(14, currentRound.level + 1)}`, { primary: true, onClick: () => startLevel(Math.min(14, currentRound.level + 1)) }),
      button('Generated practice', { onClick: () => startGenerated(currentRound.level) }),
      button('Back to levels', { onClick: () => { currentView = 'levels'; currentRound = null; engine = null; render(); } }),
    ]),
  ]);
}

function nextUncompletedRound(level, currentId) {
  const completed = new Set(appState.game.progress.completedRoundIds || []);
  return getRoundsForLevel(level).find(round => round.id !== currentId && !completed.has(round.id)) || null;
}

function handleResult(result, stage) {
  engine.state.feedback = result.feedback || null;
  appState.recordStage(currentRound, stage, result, engine);
  appState.saveCurrentRound(currentRound, engine);
  if (result.feedback?.text) announce(result.feedback.text);
  render();
}

function renderNotebook() {
  return h('section', { className: 'view', 'aria-labelledby': 'notebook-title' }, [
    h('div', { className: 'card' }, [h('p', { className: 'eyebrow', text: 'Concept notebook' }), h('h1', { id: 'notebook-title', text: 'Sensitivity field guide' }), h('p', { className: 'muted', text: 'Definitions remain tied to visuals, examples, misconceptions, and a practice level.' })]),
    h('div', { className: 'notebook-grid' }, CONCEPTS.map(concept => h('article', { className: 'card notebook-entry' }, [
      h('h2', { text: concept.title }), h('p', { text: concept.definition }),
      h('div', { className: 'feedback' }, [h('strong', { text: 'Visual: ' }), h('span', { text: concept.visual })]),
      h('p', {}, [h('strong', { text: 'Example: ' }), h('span', { text: concept.example })]),
      h('p', { className: 'muted' }, [h('strong', { text: 'Common misconception: ' }), h('span', { text: concept.misconception })]),
      button(`Practise level ${concept.level}`, { onClick: () => startLevel(concept.level) }),
    ]))),
  ]);
}

function renderProgress() {
  const game = appState.game;
  const masteryEntries = Object.entries(game.mastery);
  const accuracy = conceptAccuracy(game.mastery);
  const misconception = mostCommonMisconception(game.misconceptions);
  const review = recommendedReview(game);
  const tableRows = masteryEntries.sort(([a], [b]) => a.localeCompare(b)).map(([concept, record]) => h('tr', {}, [
    h('td', { text: concept.replaceAll('-', ' ') }), h('td', { text: record.masteryState }), h('td', { text: record.attempts }), h('td', { text: record.attempts ? `${Math.round(record.correct / record.attempts * 100)}%` : '—' }), h('td', { text: record.hintsUsed }),
  ]));
  return h('section', { className: 'view', 'aria-labelledby': 'progress-title' }, [
    h('div', { className: 'card' }, [h('p', { className: 'eyebrow', text: 'Mastery dashboard' }), h('h1', { id: 'progress-title', text: `${appState.masteryPercent}% overall mastery` }), h('div', { className: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(appState.masteryPercent) }, h('span', { style: { width: `${appState.masteryPercent}%` } }))]),
    h('div', { className: 'stat-grid' }, [
      stat('First-attempt accuracy', `${accuracy.firstAttempt}%`), stat('Cell-value / placement', `${accuracy.build}%`), stat('Shape accuracy', `${accuracy.shape}%`), stat('Structural-zero accuracy', `${accuracy.dependencies}%`),
      stat('Row-column reversals', game.misconceptions['row-column-reversal'] || 0), stat('Transpose detections', game.misconceptions.transpose || 0), stat('Most common issue', misconception ? misconception[0].replaceAll('-', ' ') : 'none'), stat('Rounds completed', game.progress.roundsCompleted),
    ]),
    h('article', { className: 'card feedback' }, [h('h2', { text: 'Recommended review' }), h('p', { text: review.text }), button(`Open level ${review.level}`, { primary: true, onClick: () => startLevel(review.level) })]),
    h('div', { className: 'card grid-wrap' }, [
      h('table', { className: 'progress-table' }, [h('thead', {}, h('tr', {}, ['Concept', 'State', 'Attempts', 'Accuracy', 'Hints'].map(label => h('th', { scope: 'col', text: label })))), h('tbody', {}, tableRows.length ? tableRows : h('tr', {}, h('td', { colspan: 5, text: 'Complete a round to populate concept-level mastery.' })))]),
    ]),
  ]);
}

function conceptAccuracy(mastery) {
  const metric = key => {
    const entries = Object.entries(mastery).filter(([name]) => name.includes(key));
    const attempts = entries.reduce((sum, [, record]) => sum + record.attempts, 0);
    const correct = entries.reduce((sum, [, record]) => sum + record.correct, 0);
    return attempts ? Math.round(correct / attempts * 100) : 0;
  };
  const all = Object.values(mastery);
  const totalAttempts = all.reduce((sum, record) => sum + record.attempts, 0);
  const first = all.reduce((sum, record) => sum + record.firstAttemptCorrect, 0);
  return { firstAttempt: totalAttempts ? Math.round(first / totalAttempts * 100) : 0, build: metric('placement'), shape: metric('shape'), dependencies: metric('structural') || metric('dependency') };
}

function renderSettings() {
  const settings = appState.settings;
  const importInput = h('input', { type: 'file', accept: 'application/json', className: 'sr-only', onChange: async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = importStore(await file.text());
    if (!result.ok) { announce(result.error); window.alert(result.error); return; }
    appState.replaceStore(result.store); applySettings(appState.settings); announce('Progress imported.'); render();
  } });
  return h('section', { className: 'view', 'aria-labelledby': 'settings-title' }, [
    h('div', { className: 'card' }, [h('p', { className: 'eyebrow', text: 'Accessibility and persistence' }), h('h1', { id: 'settings-title', text: 'Settings' })]),
    h('article', { className: 'card settings-grid' }, [
      settingToggle('Dark theme', settings.theme === 'dark', value => updateSetting('theme', value ? 'dark' : 'light')),
      settingToggle('High contrast', settings.highContrast, value => updateSetting('highContrast', value)),
      settingToggle('Larger text', settings.largeText, value => updateSetting('largeText', value)),
      settingToggle('Reduced motion', settings.reducedMotion, value => updateSetting('reducedMotion', value)),
    ]),
    h('article', { className: 'card' }, [h('h2', { text: 'Progress data' }), h('p', { className: 'muted', text: 'Export and import use the versioned suite schema. Imported JSON is validated before storage.' }), h('div', { className: 'actions' }, [
      button('Export progress', { onClick: exportProgress }),
      h('label', { className: 'btn', tabindex: '0' }, ['Import progress', importInput]),
      button('Reset progress', { className: 'danger', onClick: () => { if (window.confirm('Reset all Build the Jacobian progress?')) { appState.reset(); applySettings(appState.settings); announce('Progress reset.'); render(); } } }),
    ])]),
    h('article', { className: 'card' }, [h('h2', { text: 'Keyboard controls' }), h('p', { text: 'Tab to any control. Select a matrix cell, select a derivative tile, then activate “Place selected tile.” Drag-and-drop is optional. Every dependency wire has a text equivalent.' })]),
  ]);
}

function settingToggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', checked, onChange: event => onChange(event.target.checked) });
  return h('label', { className: 'switch-row' }, [h('strong', { text: label }), input]);
}

function updateSetting(name, value) {
  appState.updateSetting(name, value);
  applySettings(appState.settings);
  render();
}

function exportProgress() {
  const blob = new Blob([exportStore(appState.store)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'build-the-jacobian-progress.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function latexName(name) {
  const match = String(name).match(/^([A-Za-z]+)_([A-Za-z0-9]+)$/);
  return match ? `${match[1]}_{${match[2]}}` : String(name);
}

function pointLatex(point) {
  return Object.entries(point).map(([name, value]) => `${latexName(name)}=${value}`).join(',\\;');
}

init();
