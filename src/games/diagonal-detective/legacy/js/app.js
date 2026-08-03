import { loadState, saveState, resetState, exportState, importState } from './storage.js';
import { gameState } from './state.js';
import { applySettings, announce, focusMain } from './accessibility.js';
import { typesetMath } from './math-renderer.js';
import { CASES_BY_ID, PRIMARY_LEVEL_CASES, getCaseById } from './data/cases.js';
import { generateCase } from './engine/question-generator.js';
import { validateAnswer } from './engine/answer-validator.js';
import { calculateScore } from './engine/scoring.js';
import { GameEngine } from './engine/game-engine.js';
import { createWelcomeView } from './views/welcome-view.js';
import { createTutorialView } from './views/tutorial-view.js';
import { createGameView } from './views/game-view.js';
import { createNotebookView } from './views/notebook-view.js';
import { createProgressView } from './views/progress-view.js';

let rootState = loadState();
let engine = new GameEngine(rootState);
let game = gameState(rootState);
const app = document.getElementById('app');

const ui = {
  view: 'welcome',
  tutorialStep: 0,
  selectedInput: null,
  selectedOutput: null,
  pathInspection: '',
  hint: '',
  result: null,
  score: null,
  reveal: false,
  currentItem: null,
  onCheck: null
};

function resolveCurrentItem() {
  if (ui.currentItem) return ui.currentItem;
  const id = game.progress.currentCaseId;
  if (CASES_BY_ID[id]) return getCaseById(id);
  if (id?.startsWith('generated-') && game.currentRound?.seed) return generateCase(game.currentRound.seed);
  return getCaseById(PRIMARY_LEVEL_CASES[game.progress.currentLevel] ?? 'find-evidence');
}

function resetUiForCase() {
  ui.selectedInput = null;
  ui.selectedOutput = null;
  ui.pathInspection = '';
  ui.hint = '';
  ui.result = null;
  ui.score = null;
  ui.reveal = false;
}

function openItem(item) {
  ui.currentItem = item;
  resetUiForCase();
  engine.setCurrentCase(item);
  ui.view = 'game';
  render();
}

function openLevel(level) {
  const id = PRIMARY_LEVEL_CASES[level] ?? 'find-evidence';
  openItem(getCaseById(id));
}

function openCase(id) {
  if (CASES_BY_ID[id]) openItem(getCaseById(id));
}

function generateInvestigation() {
  const seed = Date.now() % 2147483647;
  const ranked = Object.entries(game.misconceptions ?? {}).sort((a, b) => b[1] - a[1]);
  const focus = ranked[0]?.[0] ?? null;
  const familyByMisconception = {
    'square-means-diagonal': 'dense',
    'diagonal-means-identity': 'independent',
    'missed-indirect-dependency': 'indirect',
    'evaluated-zero-as-structural': 'evaluated-zero',
    'structural-as-local': 'evaluated-zero',
    'false-dependency': 'sparse',
    'missing-direct-dependency': 'sparse'
  };
  const advancedFamilies = ['triangular', 'indirect', 'dense'];
  const family = familyByMisconception[focus]
    ?? (game.progress.currentStreak >= 3 ? advancedFamilies[seed % advancedFamilies.length] : undefined);
  const item = generateCase(seed, family ? { family } : {});
  if (family) item.title = `Adaptive Review: ${item.title}`;
  openItem(item);
}

function render() {
  game = gameState(rootState);
  applySettings(rootState.learner.settings);
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.setAttribute('aria-current', button.dataset.nav === ui.view ? 'page' : 'false');
  });
  app.replaceChildren();
  let view;
  if (ui.view === 'welcome') {
    view = createWelcomeView({
      game,
      onStart: openLevel,
      onContinue: () => { ui.view = 'game'; render(); },
      onTutorial: () => { ui.view = 'tutorial'; render(); }
    });
  } else if (ui.view === 'tutorial') {
    view = createTutorialView({
      step: ui.tutorialStep,
      onStep: step => { ui.tutorialStep = step; render(); },
      onFinish: () => { game.tutorialCompleted = true; saveState(rootState); openLevel(1); }
    });
  } else if (ui.view === 'notebook') {
    view = createNotebookView({ game, onOpenLevel: openLevel });
  } else if (ui.view === 'progress') {
    view = createProgressView({
      rootState,
      game,
      onExport: () => exportState(rootState),
      onImport: handleImport,
      onReset: handleReset,
      onOpenLevel: openLevel
    });
  } else {
    const item = resolveCurrentItem();
    ui.onCheck = answer => checkAnswer(item, answer);
    view = createGameView({
      item,
      rootState,
      game,
      engine,
      ui,
      onRefresh: render,
      onSelectLevel: openLevel,
      onSelectCase: openCase,
      onGenerate: generateInvestigation,
      onNext: () => openLevel(Math.min(17, item.level + 1))
    });
  }
  app.append(view);
  typesetMath(app);
}

function checkAnswer(item, answer) {
  if (game.currentRound?.lastResult?.allCorrect) {
    ui.result = game.currentRound.lastResult;
    ui.score = game.currentRound.lastScore;
    announce('This case is already solved. Continue to the next case.');
    render();
    return;
  }
  const result = validateAnswer(item, answer);
  const round = game.currentRound ?? { attempts: 0, hintsUsed: 0 };
  const score = calculateScore(result, {
    firstAttempt: round.attempts === 0,
    hintsUsed: round.hintsUsed > 0,
    streak: game.progress.currentStreak + (result.allCorrect ? 1 : 0)
  });
  engine.recordAttempt(item, result, score);
  ui.result = result;
  ui.score = score;
  announce(result.allCorrect
    ? `Case solved. Score ${score.total}.`
    : `Evidence conflict. ${result.misconceptionFeedback ?? 'Review the highlighted categories.'}`);
  render();
}

async function handleImport(file) {
  if (!file) return;
  try {
    rootState = await importState(file);
    engine = new GameEngine(rootState);
    game = gameState(rootState);
    ui.currentItem = null;
    ui.view = 'progress';
    resetUiForCase();
    render();
    announce('Progress imported successfully.');
  } catch (error) {
    showToast(error.message, 'bad');
  }
}

function handleReset() {
  if (!window.confirm('Reset all Diagonal Detective progress? This cannot be undone unless you exported it.')) return;
  rootState = resetState();
  engine = new GameEngine(rootState);
  game = gameState(rootState);
  ui.currentItem = null;
  ui.view = 'welcome';
  resetUiForCase();
  render();
  announce('Progress reset.');
}

function showToast(message, tone = '') {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
  ui.view = button.dataset.nav;
  render();
  focusMain();
}));
document.getElementById('motion-toggle')?.addEventListener('click', () => {
  rootState.learner.settings.reducedMotion = !rootState.learner.settings.reducedMotion;
  saveState(rootState);
  render();
});
document.getElementById('text-size-toggle')?.addEventListener('click', () => {
  rootState.learner.settings.largeText = !rootState.learner.settings.largeText;
  saveState(rootState);
  render();
});
window.addEventListener('mathjax-ready', () => typesetMath(app), { once: true });

render();
