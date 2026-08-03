import { LEVELS, getLevel } from './data/levels.js';
import { CONCEPTS } from './data/concepts.js';
import { MACHINES } from './data/machines.js';
import { MISCONCEPTIONS } from './data/misconceptions.js';
import { SAMPLE_ROUNDS } from './data/sample-rounds.js';
import { OPERATION_DEFINITIONS, computeOutputShape } from './math/operation-model.js';
import { computeLocalDerivative } from './math/symbolic-derivative.js';
import { computeDependencyMatrix } from './math/dependency-analysis.js';
import { evaluateOperation } from './math/numeric-evaluator.js';
import { formatPlainMath, renderAllMath } from './math-renderer.js';
import { createRoundForProgress, completeRound } from './engine/game-engine.js';
import { validateOperationChoice, validateShapeAnswer, validateNumericOutput, validateBooleanMatrix, validateNumericMatrix, validateStructureChoice, validateRepairChoice } from './engine/answer-validator.js';
import { overallMastery, mostFrequentMisconception } from './engine/mastery.js';
import { createFactoryDiagram } from './components/factory-diagram.js';
import { createNumericGrid, readNumericGrid, createDependencyGrid, readDependencyGrid } from './components/jacobian-grid.js';
import { progressBar } from './components/progress-bar.js';
import { runtime, getPersisted, getGame, getSettings, updatePersisted, replacePersisted, notify, subscribe } from './state.js';
import { defaultGameState, exportState, importState, resetState } from './storage.js';
import { announce, applySettings, focusHeading } from './accessibility.js';

const main = document.getElementById('main-content');
const settingsPanel = document.getElementById('settings-panel');

function restoreRuntimeFromPersisted() {
  const game = getGame();
  const partial = game.partialAnswer ?? {};
  runtime.round = game.currentRound ?? null;
  runtime.results = partial.results ?? {};
  runtime.hintsUsed = Number(partial.hintsUsed ?? 0);
  runtime.answerAttempt = Number(partial.answerAttempt ?? 1);
  runtime.draft = partial.draft ?? {};
  runtime.misconceptionsSeen = Array.isArray(partial.misconceptionsSeen) ? partial.misconceptionsSeen : [];
  if (runtime.round) runtime.view = 'game';
}

restoreRuntimeFromPersisted();

const PHASES = ['repair', 'operation', 'forward', 'dependencies', 'derivative'];

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function button(text, { className = '', action = null, value = null } = {}) {
  const node = element('button', className, text);
  node.type = 'button';
  if (action) node.dataset.action = action;
  if (value !== null) node.dataset.value = String(value);
  return node;
}

function math(source, { display = false, label = null } = {}) {
  const node = element(display ? 'div' : 'span', display ? 'math-block' : 'math-inline');
  node.dataset.math = source;
  if (display) node.dataset.display = 'true';
  if (label) node.dataset.label = label;
  return node;
}

function card(title, bodyClass = '') {
  const section = element('section', `card ${bodyClass}`.trim());
  const heading = element('h2', '', title);
  heading.tabIndex = -1;
  section.append(heading);
  return section;
}

function setView(view) {
  runtime.view = view;
  runtime.feedback = null;
  render();
  focusHeading();
}

function currentLevelId() { return getGame().progress.currentLevel ?? 1; }

function render() {
  applySettings(getSettings());
  main.replaceChildren();
  document.querySelectorAll('[data-nav]').forEach((node) => node.toggleAttribute('aria-current', node.dataset.nav === runtime.view));
  if (runtime.view === 'welcome') renderWelcome();
  else if (runtime.view === 'tutorial') renderTutorial();
  else if (runtime.view === 'game') renderFactoryFloor();
  else if (runtime.view === 'notebook') renderNotebook();
  else if (runtime.view === 'progress') renderProgress();
  renderAllMath(main);
}

function renderWelcome() {
  const game = getGame();
  const mastery = overallMastery(game.mastery);
  const hero = element('section', 'hero');
  const copy = element('div', 'hero-copy');
  const eyebrow = element('p', 'eyebrow', 'MATRIX CALCULUS • GAME 5');
  const title = element('h1', '', 'Broadcast Factory');
  title.tabIndex = -1;
  const subtitle = element('p', 'hero-subtitle', 'One scalar. Many output lanes.');
  const intro = element('p', '', 'Route scalars and vectors through factory machines. Predict what comes out, trace which inputs affect each lane, and assemble the Jacobian behind broadcasting.');
  const actions = element('div', 'button-row');
  actions.append(button(game.progress.tutorialComplete ? 'Review tutorial' : 'Start tutorial', { className: 'primary', action: 'start-tutorial' }), button(game.progress.completedLevels.length ? 'Continue factory' : 'Enter factory', { className: 'secondary', action: 'continue-game' }));
  copy.append(eyebrow, title, subtitle, intro, actions);

  const visual = element('div', 'hero-factory');
  const token = element('div', 'hero-token', 'z');
  token.setAttribute('aria-hidden', 'true');
  const lanes = element('div', 'hero-lanes');
  ['x₁ + z', 'x₂ + z', 'x₃ + z'].forEach((value) => lanes.append(element('div', 'hero-lane', value)));
  visual.append(token, element('div', 'branch-lines', '↘  ↓  ↙'), lanes);
  visual.setAttribute('role', 'img');
  visual.setAttribute('aria-label', 'One scalar z branches into three output lanes, while remaining one input variable.');
  hero.append(copy, visual);

  const dashboard = element('section', 'welcome-dashboard');
  const masteryCard = card('Factory status', 'status-card');
  masteryCard.append(progressBar(mastery, 'Overall mastery'), element('p', 'metric-large', `${mastery}% mastery`), element('p', '', `${game.progress.completedLevels.length} of 18 levels certified`), element('p', '', `${game.progress.score} total points`));
  const ideaCard = card('Core rule', 'idea-card');
  ideaCard.append(math('\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{m\\times n}', { display: true, label: 'The Jacobian of an m component output with respect to an n component input has shape m by n.' }), element('p', '', 'Count output components for rows. Count differentiation-input components for columns. A scalar input contributes exactly one column.'));
  const operationsCard = card('Machines on this floor', 'machine-summary');
  const list = element('ul', 'compact-list');
  MACHINES.slice(0, 6).forEach((machine) => {
    const item = element('li');
    item.append(element('strong', '', machine.name), document.createTextNode(` — ${machine.description}`));
    list.append(item);
  });
  operationsCard.append(list);
  dashboard.append(masteryCard, ideaCard, operationsCard);
  main.append(hero, dashboard);
}

const tutorialSteps = [
  { title: '1. Load a vector', body: 'A vector is a tray with one ordered lane per component.', formula: '\\mathbf{x}=\\begin{bmatrix}1\\\\2\\\\3\\end{bmatrix}' },
  { title: '2. Load one scalar', body: 'The scalar z has one degree of freedom, even when a machine reuses it.', formula: 'z=5' },
  { title: '3. Choose Broadcast Add', body: 'The machine preserves the vector lanes and adds the same scalar to each lane.', formula: '\\mathbf{y}=\\mathbf{x}+z' },
  { title: '4. Expand the operation', body: 'Component expansion makes the forward computation explicit.', formula: '\\mathbf{y}=\\begin{bmatrix}1+5\\\\2+5\\\\3+5\\end{bmatrix}=\\begin{bmatrix}6\\\\7\\\\8\\end{bmatrix}' },
  { title: '5. Inspect dependencies', body: 'Each yᵢ depends on matching xᵢ and on the same scalar z. No yᵢ depends on nonmatching xⱼ.' },
  { title: '6. Differentiate with respect to x', body: 'Matching vector lanes have slope one, so the Jacobian is identity.', formula: '\\frac{\\partial\\mathbf{y}}{\\partial\\mathbf{x}}=I_3' },
  { title: '7. Differentiate with respect to z', body: 'There are three output rows and one scalar-input column.', formula: '\\frac{\\partial\\mathbf{y}}{\\partial z}=\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix}' },
  { title: '8. Change the machine', body: 'For y = z·x, each output changes with z at rate xᵢ. Broadcasting alone does not force a ones derivative.', formula: '\\frac{\\partial(z\\mathbf{x})}{\\partial z}=\\mathbf{x}' }
];

function tutorialRound(operationType = 'vector-plus-scalar') {
  const operands = operationType === 'vector-plus-scalar'
    ? [{ name: 'x', semanticType: 'column-vector', values: [1,2,3], length: 3 }, { name: 'z', semanticType: 'scalar', value: 5 }]
    : [{ name: 'z', semanticType: 'scalar', value: 5 }, { name: 'x', semanticType: 'column-vector', values: [1,2,3], length: 3 }];
  const targetName = operationType === 'vector-plus-scalar' ? 'z' : 'z';
  return {
    operationType,
    operation: OPERATION_DEFINITIONS[operationType],
    operationLabel: OPERATION_DEFINITIONS[operationType].label,
    operands,
    output: evaluateOperation(operationType, operands),
    outputShape: computeOutputShape(operationType, operands),
    targetName,
    target: operands.find((item) => item.name === targetName),
    dependencyMatrix: computeDependencyMatrix(operationType, operands, targetName),
    derivative: computeLocalDerivative(operationType, operands, targetName)
  };
}

function renderTutorial() {
  const step = tutorialSteps[runtime.tutorialStep];
  const wrapper = element('section', 'tutorial-shell');
  const header = element('div', 'section-header');
  const title = element('h1', '', 'Interactive Tutorial');
  title.tabIndex = -1;
  header.append(title, element('p', '', `Step ${runtime.tutorialStep + 1} of ${tutorialSteps.length}`));
  const meter = progressBar(Math.round((runtime.tutorialStep + 1) / tutorialSteps.length * 100), 'Tutorial progress');
  const body = element('div', 'tutorial-grid');
  const lesson = card(step.title, 'tutorial-card');
  lesson.append(element('p', '', step.body));
  if (step.formula) lesson.append(math(step.formula, { display: true }));
  if (runtime.tutorialStep === 6) lesson.append(element('p', 'callout', 'The scalar branches into all outputs, but the denominator still has only one component.'));
  const diagram = element('div', 'factory-stage');
  diagram.append(createFactoryDiagram(tutorialRound(runtime.tutorialStep === 7 ? 'scalar-times-vector' : 'vector-plus-scalar'), { revealOutput: runtime.tutorialStep >= 3, revealDependencies: runtime.tutorialStep >= 4 }));
  body.append(lesson, diagram);
  const controls = element('div', 'button-row tutorial-controls');
  controls.append(button('Back', { className: 'ghost', action: 'tutorial-back' }), button(runtime.tutorialStep === tutorialSteps.length - 1 ? 'Start Level 1' : 'Next', { className: 'primary', action: 'tutorial-next' }));
  wrapper.append(header, meter, body, controls);
  main.append(wrapper);
}

function renderFactoryFloor() {
  const game = getGame();
  const levelId = runtime.round?.levelId ?? runtime.selectedLevel ?? game.progress.currentLevel;
  const level = getLevel(levelId);
  const shell = element('div', 'factory-layout');
  shell.append(renderLevelRail(levelId));
  const workspace = element('section', 'factory-workspace');
  if (!runtime.round) {
    const intro = card(level.title, 'level-intro');
    intro.append(element('p', 'eyebrow', `LEVEL ${level.id} • ${level.focus.toUpperCase()}`), element('p', 'level-objective', level.objective));
    const modeList = element('div', 'mode-list');
    [['Guided round','Hints and component prompts'],['Generated practice','Seeded values and target'],['Misconception repair','Find the first faulty reasoning step'],['Mastery challenge','Less scaffolding, full workflow']].forEach(([name, desc]) => {
      const item = element('div', 'mode-chip'); item.append(element('strong', '', name), element('span', '', desc)); modeList.append(item);
    });
    const unlocked = level.id <= game.progress.currentLevel || game.progress.completedLevels.includes(level.id);
    const startButton = button('Start factory order', { className: 'primary large', action: 'start-round', value: level.id });
    startButton.disabled = !unlocked;
    intro.append(modeList, startButton);
    if (!unlocked) intro.append(element('p', 'notice', `Preview only. Complete Level ${Math.max(1, level.id - 1)} before this factory order unlocks.`));
    workspace.append(intro);
  } else {
    workspace.append(renderRound(runtime.round));
  }
  shell.append(workspace);
  main.append(shell);
}

function renderLevelRail(selectedId) {
  const game = getGame();
  const aside = element('aside', 'level-rail');
  const heading = element('h2', '', 'Factory levels');
  aside.append(heading);
  const list = element('div', 'level-list');
  LEVELS.forEach((level) => {
    const completed = game.progress.completedLevels.includes(level.id);
    const current = level.id === selectedId;
    const item = button(`${level.icon} ${level.id}. ${level.title}`, { className: `level-button${completed ? ' completed' : ''}${current ? ' current' : ''}`, action: 'select-level', value: level.id });
    item.setAttribute('aria-current', current ? 'step' : 'false');
    item.title = level.objective;
    list.append(item);
  });
  aside.append(list);
  return aside;
}

function renderRound(round) {
  const section = element('div', 'round-shell');
  const header = element('div', 'round-header');
  const titleWrap = element('div');
  titleWrap.append(element('p', 'eyebrow', `LEVEL ${round.levelId} • ${round.mode.toUpperCase()} • SEED ${round.seed}`));
  const title = element('h1', '', 'Factory Order'); title.tabIndex = -1; titleWrap.append(title);
  const status = element('div', 'round-status');
  status.append(element('span', 'pill', `Target: ∂y/∂${formatPlainMath(round.targetName)}`), element('span', 'pill', `${round.difficulty}`));
  header.append(titleWrap, status);

  const order = card('Order manifest', 'order-card');
  const operandRow = element('div', 'operand-row');
  round.operands.forEach((operand) => operandRow.append(renderOperand(operand)));
  order.append(operandRow, math(operationFormula(round), { display: true }));
  if (round.context === 'shared-bias') order.append(element('p', 'context-note', 'Local view: the vector cargo represents W·x, then one scalar bias b is broadcast across all outputs.'));
  if (round.context === 'vector-bias') order.append(element('p', 'context-note', 'Local view: the vector cargo represents W·x, then independent bias components are added lane by lane.'));
  order.append(element('p', 'target-prompt', `Derivative inspection target: ${formatPlainMath(round.targetName)} (${round.target.semanticType.replace('-', ' ')})`));

  const stage = element('div', 'factory-stage');
  stage.append(createFactoryDiagram(round, { revealOutput: Boolean(runtime.results.forward?.correct), revealDependencies: Boolean(runtime.results.dependencies?.correct) }));

  section.append(header, order, stage);
  if (round.mode === 'repair') section.append(renderRepairStation(round));
  section.append(renderOperationStation(round));
  if (round.comparison) section.append(renderComparisonStation(round));
  section.append(renderExpansionStation(round), renderForwardStation(round), renderDependencyStation(round), renderDerivativeStation(round));
  if (runtime.feedback) section.append(renderFeedback(runtime.feedback));
  return section;
}

function renderOperand(operand) {
  const box = element('div', `operand-card ${operand.semanticType}`);
  box.append(element('span', 'operand-name', formatPlainMath(operand.name)), element('span', 'operand-type', operand.semanticType.replace('-', ' ')));
  if (operand.semanticType === 'scalar') box.append(element('strong', 'operand-value', String(operand.value)));
  else if (operand.semanticType === 'matrix') {
    const grid = element('div', 'mini-matrix');
    operand.values.forEach((row) => row.forEach((value) => grid.append(element('span', '', String(value)))));
    grid.style.setProperty('--columns', String(operand.columns)); box.append(grid);
  } else {
    const tray = element('ol', 'mini-vector');
    operand.values.forEach((value) => tray.append(element('li', '', String(value)))); box.append(tray);
  }
  return box;
}

function operationFormula(round) {
  if (round.displayLatex) return round.displayLatex;
  const names = round.operands.map((item) => `\\mathbf{${item.name}}`);
  switch (round.operationType) {
    case 'vector-plus-scalar': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}+${round.operands[1].name}`;
    case 'scalar-plus-vector': return `\\mathbf{y}=${round.operands[0].name}+\\mathbf{${round.operands[1].name}}`;
    case 'vector-minus-scalar': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}-${round.operands[1].name}`;
    case 'scalar-minus-vector': return `\\mathbf{y}=${round.operands[0].name}-\\mathbf{${round.operands[1].name}}`;
    case 'scalar-times-vector': return `\\mathbf{y}=${round.operands[0].name}\\mathbf{${round.operands[1].name}}`;
    case 'vector-times-scalar': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}${round.operands[1].name}`;
    case 'vector-plus-vector': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}+\\mathbf{${round.operands[1].name}}`;
    case 'vector-minus-vector': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}-\\mathbf{${round.operands[1].name}}`;
    case 'elementwise-multiply': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}\\odot\\mathbf{${round.operands[1].name}}`;
    case 'elementwise-divide': return `\\mathbf{y}=\\mathbf{${round.operands[0].name}}\\oslash\\mathbf{${round.operands[1].name}}`;
    case 'dot-product': return `s=\\mathbf{${round.operands[0].name}}^T\\mathbf{${round.operands[1].name}}`;
    case 'sum-reduction': return `s=\\sum_i ${round.operands[0].name}_i`;
    case 'matrix-vector': return `\\mathbf{y}=A\\mathbf{${round.operands[1].name}}`;
    case 'shared-scale-shift': return `\\mathbf{y}=${round.operands[1].name}\\mathbf{x}+${round.operands[2].name}`;
    case 'per-feature-scale-shift': return '\\mathbf{y}=\\boldsymbol{\\gamma}\\odot\\mathbf{x}+\\boldsymbol{\\beta}';
    default: return names.join(' ');
  }
}

function station(number, title, locked = false) {
  const section = element('section', `station${locked ? ' locked' : ''}`);
  section.dataset.station = String(number);
  const header = element('div', 'station-header');
  header.append(element('span', 'station-number', String(number)), element('h2', '', title), element('span', 'station-state', locked ? 'Locked' : 'Ready'));
  section.append(header);
  if (locked) section.setAttribute('aria-disabled', 'true');
  return section;
}

function renderRepairStation(round) {
  const done = runtime.results.repair?.correct;
  const section = station('R', 'Repair the faulty control-room claim');
  section.append(element('blockquote', 'bug-claim', round.repairScenario.claim), element('p', '', 'Which misconception caused this fault?'));
  const choices = element('div', 'choice-grid');
  const correctId = round.repairScenario.id;
  const choiceIds = [correctId, ...Object.keys(MISCONCEPTIONS).filter((id) => id !== correctId).slice(0, 7)];
  choiceIds.forEach((id) => {
    const misconception = MISCONCEPTIONS[id];
    const choice = button(misconception.title, { className: 'choice-button', action: 'choose-repair', value: id });
    choice.disabled = done;
    choices.append(choice);
  });
  section.append(choices);
  if (done) section.append(element('p', 'success-inline', 'Repair diagnosis accepted. Continue through the order to verify the correct mathematics.'));
  return section;
}

function renderOperationStation(round) {
  const locked = round.mode === 'repair' && !runtime.results.repair?.correct;
  const done = runtime.results.operation?.correct;
  const section = station(1, 'Route cargo to the correct machine', locked);
  section.append(element('p', '', 'Classify the operation using operand types and output behaviour—not the symbol alone.'));
  const choices = element('div', 'machine-grid');
  const options = new Set([round.operationType, ...round.machineOptions]);
  [...options].slice(0, 7).forEach((operationType) => {
    const definition = OPERATION_DEFINITIONS[operationType];
    const choice = button(definition.label, { className: 'machine-choice', action: 'choose-operation', value: operationType });
    choice.append(element('small', '', definition.family));
    choice.disabled = locked || done;
    choices.append(choice);
  });
  section.append(choices);
  if (done) section.append(successSummary(`Correct: ${round.operationLabel}. ${formatPlainMath(round.operation.component)}`));
  return section;
}

function comparisonAnswer(round) {
  const type = round.comparison?.operationType;
  if (type === 'dot-product' || round.operationType === 'dot-product') return 'vector-vs-scalar';
  if (type === 'matrix-vector' || round.operationType === 'matrix-vector') return 'matching-vs-mixing';
  if ((type === 'vector-plus-vector' && round.operationType === 'vector-plus-scalar') || (type === 'vector-plus-scalar' && round.operationType === 'vector-plus-vector')) return 'shared-vs-independent-bias';
  if ((type === 'elementwise-multiply' && ['scalar-times-vector','vector-times-scalar'].includes(round.operationType)) || (['scalar-times-vector','vector-times-scalar'].includes(type) && round.operationType === 'elementwise-multiply')) return 'shared-vs-feature-gate';
  return 'operand-types-control-semantics';
}

function renderComparisonStation(round) {
  const locked = !runtime.results.operation?.correct;
  const done = runtime.results.comparison?.correct;
  const section = station('C', 'Contrast the plausible look-alike', locked);
  const comparison = round.comparison;
  const comparisonShape = computeOutputShape(comparison.operationType, comparison.operands);
  const manifest = element('div', 'comparison-manifest');
  const left = element('div', 'comparison-side');
  left.append(element('strong', '', 'Current order'), math(operationFormula(round), { display: true }), element('span', '', `Output shape: ${round.outputShape.rows}×${round.outputShape.columns}`));
  const rightRound = { operationType: comparison.operationType, operands: comparison.operands };
  const right = element('div', 'comparison-side');
  const comparisonOutput = comparison.output ?? evaluateOperation(comparison.operationType, comparison.operands);
  const formattedComparisonOutput = Array.isArray(comparisonOutput) ? `[${comparisonOutput.join(', ')}]` : String(comparisonOutput);
  right.append(element('strong', '', 'Look-alike'), math(operationFormula(rightRound), { display: true }), element('span', '', `Output shape: ${comparisonShape.rows}×${comparisonShape.columns}`), element('span', '', `Forward output: ${formattedComparisonOutput}`));
  manifest.append(left, right);
  section.append(element('p', '', 'Choose the statement that explains the mathematical difference.'), manifest);
  const choices = [
    ['vector-vs-scalar', 'Scalar–vector scaling preserves one output per vector lane; a dot product reduces two vectors to one scalar.'],
    ['matching-vs-mixing', 'Broadcasting keeps matching vector lanes plus a shared scalar; matrix multiplication can mix several input lanes into each output.'],
    ['shared-vs-independent-bias', 'A shared scalar bias has one degree of freedom; a vector bias has one independent parameter per feature.'],
    ['shared-vs-feature-gate', 'A shared gate creates one input column; per-feature gates create one input column per feature.'],
    ['operand-types-control-semantics', 'The symbol alone is insufficient; operand types determine whether the operation broadcasts, pairs, mixes, or reduces.']
  ];
  const choiceGrid = element('div', 'choice-grid');
  choices.forEach(([value, label]) => {
    const choice = button(label, { className: 'choice-button', action: 'choose-comparison', value });
    choice.disabled = locked || done;
    choiceGrid.append(choice);
  });
  section.append(choiceGrid);
  if (done) section.append(successSummary('Contrast accepted. The two expressions may look similar, but their operand types, output shapes, and dependency maps differ.'));
  return section;
}

function expansionChoices(round) {
  const correct = round.operation.component;
  const choices = [{ key: 'correct', formula: correct, note: 'Preserves the operation’s actual operand types.' }];
  if (round.operation.family === 'broadcast') choices.push({ key: 'independent-scalar', formula: 'y_i=x_i+z_i', note: 'Incorrectly invents one independent scalar per lane.' });
  else choices.push({ key: 'shared-scalar', formula: 'y_i=x_i+z', note: 'Incorrectly replaces an operand with one shared scalar.' });
  choices.push({ key: 'reduction', formula: 's=Σ_i x_i', note: 'Funnels all lanes into one scalar.' });
  choices.push({ key: 'dense-mixing', formula: 'y_i=Σ_j A_{ij}x_j', note: 'Mixes several input coordinates into each output.' });
  return choices;
}

function renderExpansionStation(round) {
  const locked = !runtime.results.operation?.correct || Boolean(round.comparison && !runtime.results.comparison?.correct);
  const done = runtime.results.expansion?.correct;
  const section = station(2, 'Expand one output component', locked);
  section.append(element('p', '', 'Select the component rule that the machine applies. This prevents a familiar symbol from hiding the operand semantics.'));
  const choices = element('div', 'choice-grid expansion-grid');
  expansionChoices(round).forEach((option) => {
    const choice = button('', { className: 'choice-button formula-choice', action: 'choose-expansion', value: option.key });
    choice.append(element('strong', '', formatPlainMath(option.formula)), element('small', '', option.note));
    choice.disabled = locked || done;
    choices.append(choice);
  });
  section.append(choices);
  if (done) {
    section.append(successSummary(`Component rule accepted: ${formatPlainMath(round.operation.component)}.`));
    if (['vector-plus-scalar','scalar-plus-vector'].includes(round.operationType)) section.append(math('\\mathbf{x}+z=\\mathbf{x}+z\\mathbf{1}', { display: true, label: 'A vector plus scalar can be written as x plus z times a vector of ones.' }));
  }
  return section;
}

function renderForwardStation(round) {
  const locked = !runtime.results.expansion?.correct;
  const done = runtime.results.forward?.correct;
  const section = station(3, 'Scan output shape and run the machine', locked);
  section.append(element('p', '', 'First enter the output dimensions. Then calculate one value for each output component.'));
  const shapeRow = element('div', 'shape-entry');
  const shapeHint = round.mode === 'guided';
  shapeRow.append(labelledNumber('Rows', 'output-rows', shapeHint ? round.outputShape.rows : ''), labelledNumber('Columns', 'output-columns', shapeHint ? round.outputShape.columns : ''));
  section.append(shapeRow);
  const outputCount = round.outputShape.components;
  const outputInputs = element('div', 'output-lanes');
  outputInputs.style.setProperty('--count', String(outputCount));
  for (let i = 0; i < outputCount; i += 1) outputInputs.append(labelledNumber(outputCount === 1 ? 's' : formatPlainMath(`y_${i + 1}`), `output-${i}`, ''));
  section.append(outputInputs, button('Inspect output', { className: 'primary', action: 'check-forward' }));
  if (locked || done) section.querySelectorAll('input, button').forEach((node) => { node.disabled = locked || done; });
  if (done) {
    const expected = Array.isArray(round.output) ? round.output : [round.output];
    section.append(successSummary(`Output accepted: [${expected.join(', ')}]. Shape ${round.outputShape.rows}×${round.outputShape.columns}.`));
  }
  return section;
}

function labelledNumber(label, id, placeholder) {
  const wrap = element('label', 'field');
  wrap.append(element('span', '', label));
  const input = document.createElement('input');
  input.type = 'number'; input.step = 'any'; input.id = id; input.name = id; input.placeholder = placeholder === '' ? '' : String(placeholder); input.inputMode = 'decimal';
  if (runtime.draft[id] !== undefined) input.value = String(runtime.draft[id]);
  wrap.append(input);
  return wrap;
}

function renderDependencyStation(round) {
  const locked = !runtime.results.forward?.correct;
  const done = runtime.results.dependencies?.correct;
  const section = station(4, `Wire output dependencies with respect to ${round.targetName}`, locked);
  section.append(element('p', '', 'Toggle a cell on when changing the input component for that column can change the output component for that row.'));
  const labels = element('div', 'grid-explanation');
  labels.append(element('span', '', `Rows: ${round.outputShape.components} output component${round.outputShape.components === 1 ? '' : 's'}`), element('span', '', `Columns: ${round.derivative.shape.columns} ${round.targetName} component${round.derivative.shape.columns === 1 ? '' : 's'}`));
  const grid = createDependencyGrid(round.dependencyMatrix, { interactive: !locked && !done, initial: runtime.draft.dependencyMatrix });
  grid.id = 'dependency-answer-grid';
  section.append(labels, grid, button('Test dependency wiring', { className: 'primary', action: 'check-dependencies' }));
  if (locked || done) section.querySelectorAll('button').forEach((node) => { if (!node.classList.contains('dependency-cell') || locked) node.disabled = true; });
  if (done) section.append(successSummary(`Dependency pattern: ${round.dependencyPattern}.`));
  return section;
}

function renderDerivativeStation(round) {
  const locked = !runtime.results.dependencies?.correct;
  const done = runtime.results.derivative?.correct && runtime.results.derivativeShape?.correct && runtime.results.structure?.correct;
  const section = station(5, `Assemble ∂output/∂${round.targetName}`, locked);
  section.append(element('p', '', 'Predict the derivative dimensions before inserting values. Numerator layout is enforced.'));
  const shapeRow = element('div', 'shape-entry');
  const shapeHint = round.mode === 'guided';
  shapeRow.append(labelledNumber('Derivative rows', 'derivative-rows', shapeHint ? round.derivative.shape.rows : ''), labelledNumber('Derivative columns', 'derivative-columns', shapeHint ? round.derivative.shape.columns : ''));
  section.append(shapeRow);
  const derivativeDraft = Array.from({ length: round.derivative.shape.rows }, (_, row) => Array.from({ length: round.derivative.shape.columns }, (_, column) => runtime.draft[`derivative-${row}-${column}`] ?? ''));
  const grid = createNumericGrid(round.derivative.shape.rows, round.derivative.shape.columns, { name: 'derivative', values: derivativeDraft });
  grid.id = 'derivative-answer-grid';
  section.append(grid);
  const structure = element('fieldset', 'structure-choices');
  const legend = element('legend', '', 'Derivative structure'); structure.append(legend);
  ['identity','scaled-identity','diagonal','full-column','dense','reduction'].forEach((value) => {
    const label = element('label', 'radio-chip');
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'structure'; input.value = value; input.checked = runtime.draft.structure === value;
    label.append(input, document.createTextNode(value.replace('-', ' '))); structure.append(label);
  });
  section.append(structure, button('Run derivative inspection', { className: 'primary', action: 'check-derivative' }));
  if (locked || done) section.querySelectorAll('input, button').forEach((node) => { node.disabled = locked || done; });
  if (done) section.append(renderWorkedSolution(round));
  return section;
}

function successSummary(text) { return element('p', 'success-inline', text); }

function comparisonTargetName(comparison) {
  if (comparison.targetName) return comparison.targetName;
  if (comparison.operationType === 'matrix-vector') return comparison.operands.find((item) => item.semanticType === 'column-vector')?.name;
  if (comparison.operationType === 'dot-product') return comparison.operands[0]?.name;
  if (['vector-plus-vector','vector-minus-vector','elementwise-multiply','elementwise-divide'].includes(comparison.operationType)) return comparison.operands[1]?.name;
  if (['vector-plus-scalar','vector-minus-scalar'].includes(comparison.operationType)) return comparison.operands.find((item) => item.semanticType === 'scalar')?.name;
  if (['scalar-plus-vector','scalar-minus-vector','scalar-times-vector'].includes(comparison.operationType)) return comparison.operands[0]?.name;
  if (comparison.operationType === 'vector-times-scalar') return comparison.operands[1]?.name;
  return comparison.operands.find((item) => item.semanticType !== 'matrix')?.name;
}

function renderWorkedSolution(round) {
  const box = element('div', 'worked-solution');
  box.append(element('h3', '', 'Inspection report'), math(round.operation.component, { display: true }));
  const componentList = element('ul', 'component-list');
  round.componentForm.slice(0, 5).forEach((entry) => componentList.append(element('li', '', formatPlainMath(entry))));
  box.append(componentList, element('p', '', `Derivative shape: ${round.derivative.shape.rows}×${round.derivative.shape.columns}. Structure: ${round.derivative.classification.join(', ')}.`));
  const matrix = createNumericGrid(round.derivative.shape.rows, round.derivative.shape.columns, { values: round.derivative.matrix, readonly: true, name: 'solution' });
  box.append(matrix);
  if (round.comparison) {
    try {
      const targetName = comparisonTargetName(round.comparison);
      const comparisonDerivative = computeLocalDerivative(round.comparison.operationType, round.comparison.operands, targetName);
      const comparisonBox = element('div', 'comparison-solution');
      comparisonBox.append(element('h4', '', 'Look-alike derivative'), element('p', '', `For the comparison operation, differentiating with respect to ${targetName} gives shape ${comparisonDerivative.shape.rows}×${comparisonDerivative.shape.columns}.`), createNumericGrid(comparisonDerivative.shape.rows, comparisonDerivative.shape.columns, { values: comparisonDerivative.matrix, readonly: true, name: 'comparison-solution' }));
      box.append(comparisonBox);
    } catch {
      box.append(element('p', 'context-note', 'The comparison machine has a different output or dependency pattern; inspect its operand types before applying a Jacobian rule.'));
    }
  }
  box.append(element('p', 'neural-connection', round.neuralConnection));
  const controls = element('div', 'button-row');
  controls.append(button('Complete order', { className: 'primary', action: 'complete-round' }), button('New order, same level', { className: 'secondary', action: 'new-round', value: round.levelId }));
  box.append(controls);
  return box;
}

function renderFeedback(feedback) {
  const box = element('aside', `feedback-panel ${feedback.correct ? 'correct' : 'incorrect'}`);
  box.setAttribute('role', 'status');
  box.append(element('h2', '', feedback.correct ? 'Station accepted' : 'Inspection failed'), element('p', '', feedback.message));
  if (feedback.misconception && MISCONCEPTIONS[feedback.misconception]) {
    const item = MISCONCEPTIONS[feedback.misconception];
    box.append(element('h3', '', item.title), element('p', '', item.feedback));
  }
  if (!feedback.correct && runtime.round) box.append(button(`Hint ${Math.min(runtime.hintsUsed + 1, runtime.round.hints.length)}`, { className: 'ghost', action: 'show-hint' }));
  return box;
}

function renderNotebook() {
  const wrapper = element('section', 'notebook-page');
  const title = element('h1', '', 'Concept Notebook'); title.tabIndex = -1;
  wrapper.append(title, element('p', 'page-intro', 'Factory rules collected as component expansions, derivative structures, and misconception checks.'));
  const grid = element('div', 'notebook-grid');
  CONCEPTS.forEach((concept) => {
    const entry = card(concept.title, 'notebook-entry');
    const visual = element('div', 'notebook-diagram', concept.id.includes('shared') || concept.id.includes('broadcast') || concept.id.includes('scalar') ? 'one token → many effects' : 'matching lanes → diagonal structure');
    visual.setAttribute('role', 'img'); visual.setAttribute('aria-label', visual.textContent);
    entry.append(visual, math(concept.formula, { display: true }), element('p', '', concept.summary), element('p', 'misconception-note', `Watch for: ${concept.misconception}`), button(`Open Level ${concept.level}`, { className: 'secondary', action: 'open-level', value: concept.level }));
    grid.append(entry);
  });
  wrapper.append(grid);
  main.append(wrapper);
}

function renderProgress() {
  const game = getGame();
  const mastery = overallMastery(game.mastery);
  const wrapper = element('section', 'progress-page');
  const title = element('h1', '', 'Factory Progress'); title.tabIndex = -1;
  wrapper.append(title, element('p', 'page-intro', 'Progress is stored locally in a versioned schema and can be exported or imported.'));
  const metrics = element('div', 'metric-grid');
  [['Overall mastery', `${mastery}%`],['Certified levels', `${game.progress.completedLevels.length}/18`],['Total score', String(game.progress.score)],['Current level', String(game.progress.currentLevel)]].forEach(([name, value]) => {
    const item = element('div', 'metric-card'); item.append(element('span', '', name), element('strong', '', value)); metrics.append(item);
  });
  wrapper.append(metrics, progressBar(mastery, 'Overall mastery'));
  const stationCard = card('Station accuracy', 'station-accuracy-card');
  const stationGrid = element('div', 'metric-grid station-metrics');
  const stationLabels = {
    'operation-classification': 'Operation',
    'output-shape': 'Output shape',
    'forward-output': 'Forward values',
    'dependency-map': 'Dependencies',
    'derivative-shape': 'Derivative shape',
    'derivative-values': 'Derivative values',
    'derivative-structure': 'Structure',
    'operation-comparison': 'Comparisons',
    'component-expansion': 'Component rule'
  };
  Object.entries(stationLabels).forEach(([key, label]) => {
    const stats = game.progress.stationStats?.[key] ?? { attempts: 0, correct: 0 };
    const accuracy = stats.attempts ? Math.round(stats.correct / stats.attempts * 100) : 0;
    const item = element('div', 'metric-card compact-metric');
    item.append(element('span', '', label), element('strong', '', stats.attempts ? `${accuracy}%` : '—'), element('small', '', `${stats.attempts} attempt${stats.attempts === 1 ? '' : 's'}`));
    stationGrid.append(item);
  });
  stationCard.append(stationGrid);
  const skillCard = card('Concept evidence', 'mastery-table-card');
  const table = element('table', 'mastery-table');
  const thead = element('thead'); const headRow = element('tr'); ['Concept','Attempts','Accuracy','State'].forEach((name) => headRow.append(element('th', '', name))); thead.append(headRow); table.append(thead);
  const tbody = element('tbody');
  const entries = Object.entries(game.mastery);
  if (!entries.length) {
    const row = element('tr'); const cell = element('td', '', 'Complete a factory order to begin mastery tracking.'); cell.colSpan = 4; row.append(cell); tbody.append(row);
  } else entries.sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
    const row = element('tr');
    const accuracy = item.attempts ? Math.round(item.correct / item.attempts * 100) : 0;
    [name.replaceAll('-', ' '), item.attempts, `${accuracy}%`, item.masteryState].forEach((value) => row.append(element('td', '', String(value)))); tbody.append(row);
  });
  table.append(tbody); skillCard.append(table);
  const frequent = mostFrequentMisconception(game.mastery);
  const recommendation = card('Recommended review', 'recommendation-card');
  recommendation.append(element('p', '', frequent ? MISCONCEPTIONS[frequent]?.feedback ?? frequent : 'No repeated misconception detected yet. Start with scalar expansion and derivative shapes.'), button(`Review Level ${recommendedLevel(frequent)}`, { className: 'primary', action: 'open-level', value: recommendedLevel(frequent) }));
  const persistence = card('Progress data', 'persistence-card');
  const actions = element('div', 'button-row'); actions.append(button('Export progress', { className: 'secondary', action: 'export-progress' }), button('Import progress', { className: 'secondary', action: 'import-progress' }), button('Reset progress', { className: 'danger', action: 'reset-progress' }));
  const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'application/json,.json'; fileInput.id = 'progress-file'; fileInput.hidden = true;
  persistence.append(actions, fileInput);
  wrapper.append(stationCard, skillCard, recommendation, persistence);
  main.append(wrapper);
}

function recommendedLevel(misconception) {
  if (['scalar-derivative-as-scalar','wrong-orientation','identity-for-scalar-derivative'].includes(misconception)) return 5;
  if (['ones-for-scaling','missing-scalar-multiplier'].includes(misconception)) return 7;
  if (misconception === 'dot-product-confusion') return 11;
  if (misconception === 'shared-vector-bias-confusion') return 13;
  return 2;
}

function showSettings() {
  const settings = getSettings();
  settingsPanel.replaceChildren();
  const heading = element('h2', '', 'Display settings');
  const reduced = element('label', 'setting-row');
  const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(settings.reducedMotion); checkbox.dataset.setting = 'reducedMotion';
  reduced.append(checkbox, document.createTextNode('Reduce instructional motion'));
  const scale = element('label', 'setting-row'); scale.append(element('span', '', 'Text size'));
  const range = document.createElement('input'); range.type = 'range'; range.min = '0.9'; range.max = '1.25'; range.step = '0.05'; range.value = String(settings.fontScale ?? 1); range.dataset.setting = 'fontScale'; scale.append(range);
  settingsPanel.append(heading, reduced, scale);
  settingsPanel.hidden = !settingsPanel.hidden;
  document.querySelector('[data-action="settings"]').setAttribute('aria-expanded', String(!settingsPanel.hidden));
}

function writeRuntimeSnapshot(game) {
  game.currentRound = runtime.round;
  game.partialAnswer = runtime.round ? {
    results: runtime.results,
    hintsUsed: runtime.hintsUsed,
    answerAttempt: runtime.answerAttempt,
    draft: runtime.draft,
    misconceptionsSeen: runtime.misconceptionsSeen
  } : null;
}

function persistRuntimeSnapshot() {
  if (!runtime.round) return;
  updatePersisted((state) => writeRuntimeSnapshot(state.learner.games.broadcastFactory));
}

function recordStationAttempt(stage, result) {
  updatePersisted((state) => {
    const game = state.learner.games.broadcastFactory;
    game.progress.stationStats ??= {};
    const stats = game.progress.stationStats[stage] ?? { attempts: 0, correct: 0 };
    stats.attempts += 1;
    if (result.correct) stats.correct += 1;
    game.progress.stationStats[stage] = stats;
    writeRuntimeSnapshot(game);
  });
}

function feedback(result, successMessage, fallbackMessage) {
  runtime.feedback = { ...result, message: result.correct ? successMessage : (result.message ?? fallbackMessage) };
  if (!result.correct) runtime.answerAttempt += 1;
  if (result.misconception && !runtime.misconceptionsSeen.includes(result.misconception)) runtime.misconceptionsSeen.push(result.misconception);
  persistRuntimeSnapshot();
  announce(runtime.feedback.message);
  render();
}

function selectedStructure() { return document.querySelector('input[name="structure"]:checked')?.value ?? ''; }

function checkForward() {
  const round = runtime.round;
  const shapeResult = validateShapeAnswer({ rows: document.getElementById('output-rows')?.value, columns: document.getElementById('output-columns')?.value }, round.outputShape, 'output');
  const outputValues = Array.from({ length: round.outputShape.components }, (_, i) => document.getElementById(`output-${i}`)?.value);
  const forwardResult = validateNumericOutput(outputValues, round.output);
  const combined = { correct: shapeResult.correct && forwardResult.correct, points: forwardResult.points, misconception: shapeResult.misconception ?? forwardResult.misconception, message: !shapeResult.correct ? shapeResult.message : forwardResult.message };
  runtime.results.outputShape = shapeResult;
  runtime.results.forward = combined;
  recordStationAttempt('output-shape', shapeResult);
  recordStationAttempt('forward-output', forwardResult);
  feedback(combined, 'Output scanner accepted the dimensions and lane values.', combined.message);
}

function checkDependencies() {
  const round = runtime.round;
  const submitted = readDependencyGrid(document.getElementById('dependency-answer-grid'), round.dependencyMatrix.length, round.dependencyMatrix[0].length);
  const result = validateBooleanMatrix(submitted, round.dependencyMatrix);
  runtime.results.dependencies = result;
  recordStationAttempt('dependency-map', result);
  feedback(result, `Dependency wiring accepted: ${round.dependencyPattern}.`, result.message);
}

function checkDerivative() {
  const round = runtime.round;
  const shapeResult = validateShapeAnswer({ rows: document.getElementById('derivative-rows')?.value, columns: document.getElementById('derivative-columns')?.value }, round.derivative.shape, 'derivative');
  const matrixResult = validateNumericMatrix(readNumericGrid(document.getElementById('derivative-answer-grid'), round.derivative.shape.rows, round.derivative.shape.columns), round.derivative.matrix, round);
  const structureResult = validateStructureChoice(selectedStructure(), round.derivative.classification);
  runtime.results.derivativeShape = shapeResult;
  runtime.results.derivative = matrixResult;
  runtime.results.structure = structureResult;
  recordStationAttempt('derivative-shape', shapeResult);
  recordStationAttempt('derivative-values', matrixResult);
  recordStationAttempt('derivative-structure', structureResult);
  const combined = { correct: shapeResult.correct && matrixResult.correct && structureResult.correct, points: shapeResult.points + matrixResult.points + structureResult.points, misconception: shapeResult.misconception ?? matrixResult.misconception ?? structureResult.misconception, message: !shapeResult.correct ? shapeResult.message : !matrixResult.correct ? matrixResult.message : 'Reconsider whether the entries form identity, a scaled identity, a general diagonal, a full column, a dense matrix, or a reduction row.' };
  feedback(combined, 'Derivative inspection accepted. Review the component proof and neural-network connection.', combined.message);
}

function completeCurrentRound() {
  const game = getGame();
  const outcome = completeRound(game, runtime.round, runtime.results, { hintsUsed: runtime.hintsUsed, answerAttempt: runtime.answerAttempt, misconceptionsSeen: runtime.misconceptionsSeen });
  updatePersisted((state) => { state.learner.games.broadcastFactory = outcome.game; });
  const levelId = runtime.round.levelId;
  runtime.round = null; runtime.results = {}; runtime.hintsUsed = 0; runtime.feedback = null; runtime.draft = {}; runtime.misconceptionsSeen = []; runtime.answerAttempt = 1;
  announce(`Factory order complete. ${outcome.score} points awarded.`);
  runtime.view = 'game';
  runtime.selectedLevel = null;
  render();
  const note = element('div', 'completion-toast', `Order complete: +${outcome.score} points. ${outcome.allCorrect ? 'Level certified.' : 'Practice recorded.'}`);
  main.prepend(note);
  if (levelId === 18 && outcome.allCorrect) note.append(document.createTextNode(' Final Factory Certification achieved.'));
}

function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function handleAction(action, value, target) {
  if (action === 'start-tutorial') { runtime.tutorialStep = 0; setView('tutorial'); }
  else if (action === 'continue-game') setView('game');
  else if (action === 'tutorial-back') { runtime.tutorialStep = Math.max(0, runtime.tutorialStep - 1); render(); }
  else if (action === 'tutorial-next') {
    if (runtime.tutorialStep < tutorialSteps.length - 1) { runtime.tutorialStep += 1; render(); }
    else {
      updatePersisted((state) => { state.learner.games.broadcastFactory.progress.tutorialComplete = true; });
      runtime.view = 'game'; render();
    }
  }
  else if (action === 'select-level' || action === 'open-level') {
    runtime.round = null; runtime.results = {}; runtime.feedback = null; runtime.draft = {}; runtime.misconceptionsSeen = []; runtime.selectedLevel = Number(value);
    updatePersisted((state) => { const game = state.learner.games.broadcastFactory; game.currentRound = null; game.partialAnswer = null; });
    runtime.view = 'game'; render();
  }
  else if (action === 'start-round' || action === 'new-round') {
    const levelId = Number(value);
    runtime.round = createRoundForProgress(getGame(), levelId); runtime.results = {}; runtime.hintsUsed = 0; runtime.feedback = null; runtime.answerAttempt = 1; runtime.draft = {}; runtime.misconceptionsSeen = []; persistRuntimeSnapshot(); render(); focusHeading();
  }
  else if (action === 'choose-repair') {
    const result = validateRepairChoice(value, runtime.round); runtime.results.repair = result; recordStationAttempt('misconception-repair', result); feedback(result, 'You found the first faulty reasoning step.', 'That label does not match the control-room claim. Focus on exactly what the claim gets wrong.');
  }
  else if (action === 'choose-operation') {
    const result = validateOperationChoice(value, runtime.round); runtime.results.operation = result; recordStationAttempt('operation-classification', result); feedback(result, `Correct machine: ${runtime.round.operationLabel}.`, result.message);
  }
  else if (action === 'choose-comparison') {
    const result = { correct: value === comparisonAnswer(runtime.round), points: value === comparisonAnswer(runtime.round) ? 15 : 0, misconception: null, message: 'Compare operand types, output shape, and whether lanes are matched, mixed, or reduced.' };
    runtime.results.comparison = result;
    recordStationAttempt('operation-comparison', result);
    feedback(result, 'Comparison accepted.', result.message);
  }
  else if (action === 'choose-expansion') {
    const misconception = value === 'independent-scalar' ? 'scalar-independent-copies' : value === 'reduction' ? 'dot-product-confusion' : value === 'dense-mixing' ? 'matrix-confusion' : null;
    const result = { correct: value === 'correct', points: value === 'correct' ? 10 : 0, misconception, message: 'Write the rule for one output component while preserving the actual operand types.' };
    runtime.results.expansion = result;
    recordStationAttempt('component-expansion', result);
    feedback(result, `Component expansion accepted: ${formatPlainMath(runtime.round.operation.component)}.`, result.message);
  }
  else if (action === 'check-forward') checkForward();
  else if (action === 'check-dependencies') checkDependencies();
  else if (action === 'check-derivative') checkDerivative();
  else if (action === 'show-hint') {
    const hint = runtime.round.hints[Math.min(runtime.hintsUsed, runtime.round.hints.length - 1)]; runtime.hintsUsed += 1; runtime.feedback = { correct: false, message: hint }; persistRuntimeSnapshot(); announce(hint); render();
  }
  else if (action === 'complete-round') completeCurrentRound();
  else if (action === 'settings') showSettings();
  else if (action === 'export-progress') download('broadcast-factory-progress.json', exportState(getPersisted()));
  else if (action === 'import-progress') document.getElementById('progress-file')?.click();
  else if (action === 'reset-progress') {
    if (window.confirm('Reset all Broadcast Factory progress on this device?')) { replacePersisted(defaultGameState()); restoreRuntimeFromPersisted(); runtime.view = 'welcome'; render(); announce('Progress reset.'); }
  }
}

document.addEventListener('click', (event) => {
  const dependencyCell = event.target.closest('.dependency-cell');
  if (dependencyCell && runtime.round) {
    const grid = document.getElementById('dependency-answer-grid');
    if (grid) {
      runtime.draft.dependencyMatrix = readDependencyGrid(grid, runtime.round.dependencyMatrix.length, runtime.round.dependencyMatrix[0].length);
      persistRuntimeSnapshot();
    }
  }
  const nav = event.target.closest('[data-nav]');
  if (nav) { setView(nav.dataset.nav); return; }
  const actionTarget = event.target.closest('[data-action]');
  if (actionTarget) handleAction(actionTarget.dataset.action, actionTarget.dataset.value, actionTarget);
});

document.addEventListener('input', (event) => {
  if (!runtime.round || event.target.dataset.setting || event.target.id === 'progress-file') return;
  const target = event.target;
  const key = target.id || target.name;
  if (!key) return;
  if (target.type === 'radio') {
    if (target.checked) runtime.draft[key] = target.value;
  } else runtime.draft[key] = target.value;
  persistRuntimeSnapshot();
});

document.addEventListener('change', async (event) => {
  if (event.target.id === 'progress-file') {
    const file = event.target.files?.[0];
    if (!file) return;
    try { replacePersisted(importState(await file.text())); restoreRuntimeFromPersisted(); announce('Progress imported.'); render(); }
    catch (error) { announce(error.message); window.alert(error.message); }
  }
  if (event.target.dataset.setting) {
    const key = event.target.dataset.setting;
    updatePersisted((state) => { state.learner.settings[key] = event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value); });
    applySettings(getSettings());
  }
});

subscribe(() => applySettings(getSettings()));
render();
