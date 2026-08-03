import { loadState, saveState, resetState, exportState, importState } from './storage.js';
import { gameState } from './state.js';
import { applySettings, announce, focusMain } from './accessibility.js';
import { typesetMath } from './math-renderer.js';
import { roundForLevel } from './data/sample-rounds.js';
import { GameEngine } from './engine/game-engine.js';
import { validateRound } from './engine/answer-validator.js';
import { calculateScore } from './engine/scoring.js';
import { generateRound } from './engine/question-generator.js';
import { roundStageRange, stageReadiness } from './engine/stage-validator.js';
import { createWelcomeView } from './views/welcome-view.js';
import { createTutorialView } from './views/tutorial-view.js';
import { createCircuitLabView } from './views/circuit-lab-view.js';
import { createNotebookView } from './views/notebook-view.js';
import { createProgressView } from './views/progress-view.js';

let rootState = loadState();
let game = gameState(rootState);
let engine = new GameEngine(rootState);
const app = document.getElementById('app');
const ui = {
  view:'welcome',
  tutorialStep:0,
  round:null,
  stage:0,
  result:null,
  hint:''
};

function currentRound() {
  if (ui.round) return ui.round;
  if (game.currentRound?.round) {
    const stored = game.currentRound.round;
    return stored.mode === 'guided'
      ? roundForLevel(stored.level, 'guided')
      : stored;
  }
  const id = game.currentRound?.id;
  if (id) {
    const base = roundForLevel(game.progress.currentLevel);
    if (base.id === id || id.startsWith('level-')) return base;
  }
  return roundForLevel(game.progress.currentLevel);
}

function setInitialStage(round) {
  ui.stage = roundStageRange(round).start;
  if (game.currentRound) game.currentRound.stage = ui.stage;
  saveState(rootState);
}

function openLevel(level) {
  ui.round = roundForLevel(level);
  ui.result = null;
  ui.hint = '';
  engine.beginRound(ui.round);
  setInitialStage(ui.round);
  ui.view = 'game';
  render();
}

function openMode(mode) {
  const level = currentRound().level;
  ui.round = mode === 'generated'
    ? generateRound(Date.now() % 2147483647, { level })
    : roundForLevel(level, mode);
  ui.result = null;
  ui.hint = '';
  engine.beginRound(ui.round);
  setInitialStage(ui.round);
  render();
}

function continueRound() {
  ui.round = currentRound();
  engine.resumeRound(ui.round);
  ui.stage = game.currentRound?.stage ?? roundStageRange(ui.round).start;
  ui.view = 'game';
  ui.result = game.currentRound?.lastResult ? {
    ...game.currentRound.lastResult,
    score:game.currentRound.lastScore
  } : null;
  render();
}

function patchPartial(patch) {
  engine.patchPartial(patch);
  ui.result = null;
  render();
}

function moveStage(stage) {
  const round = currentRound();
  const { start, end } = roundStageRange(round);
  const target = Math.max(start, Math.min(end, stage));

  if (target > ui.stage) {
    const readiness = stageReadiness(round, game.currentRound?.partial ?? {}, ui.stage);
    if (!readiness.complete) {
      announce(readiness.message);
      return;
    }
  }

  ui.stage = target;
  if (game.currentRound) game.currentRound.stage = ui.stage;
  saveState(rootState);
  announce(`Stage ${ui.stage + 1}, ${['Decompose', 'Connect', 'Label', 'Trace', 'Propagate'][ui.stage]}, selected.`);
  render();
}

function submit() {
  const round = currentRound();
  const partial = game.currentRound?.partial ?? {};
  const result = validateRound(round, partial);
  const score = calculateScore(result.stages, {
    firstAttempt:(game.currentRound?.attempts ?? 0) === 0,
    hintsUsed:game.currentRound?.hintsUsed ?? 0,
    streak:game.progress.currentStreak
  });
  engine.recordAttempt(round, result, score);
  ui.result = { ...result, score };
  announce(result.allCorrect
    ? `Circuit complete. ${score.total} signal points.`
    : `Circuit fault. ${result.feedback}`);
  render();
}

function hint() {
  const round = currentRound();
  engine.useHint();
  const hints = round.hints ?? [];
  const hintIndex = Math.max(0, Math.min((game.currentRound?.hintsUsed ?? 1) - 1, Math.max(0, hints.length - 1)));
  ui.hint = hints[hintIndex] ?? 'Check the requested derivative, then verify one local edge and its shape at a time.';
  announce(`Hint: ${ui.hint}`);
  render();
}

async function handleImport(file) {
  if (!file) return;
  try {
    rootState = await importState(file);
    game = gameState(rootState);
    engine = new GameEngine(rootState);
    ui.view = 'progress';
    ui.round = null;
    ui.result = null;
    render();
    announce('Progress imported.');
  } catch (error) {
    announce(error.message);
  }
}

function handleReset() {
  if (!window.confirm('Reset all Chain Rule Circuit progress? Export first if you need a backup.')) return;
  rootState = resetState();
  game = gameState(rootState);
  engine = new GameEngine(rootState);
  ui.view = 'welcome';
  ui.round = null;
  ui.result = null;
  ui.hint = '';
  render();
  announce('Progress reset.');
}

function updateHeader() {
  const status = document.getElementById('header-game-status');
  if (status) status.textContent = `Level ${game.progress.currentLevel} · ${game.progress.score} pts`;
  const textToggle = document.getElementById('text-size-toggle');
  const motionToggle = document.getElementById('motion-toggle');
  textToggle?.setAttribute('aria-pressed', String(Boolean(rootState.learner.settings.largeText)));
  motionToggle?.setAttribute('aria-pressed', String(Boolean(rootState.learner.settings.reducedMotion)));

  document.querySelectorAll('[data-nav]').forEach(button => {
    const current = button.dataset.nav === ui.view;
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function render() {
  game = gameState(rootState);
  applySettings(rootState.learner.settings);
  updateHeader();

  let view;
  if (ui.view === 'welcome') {
    document.title = 'Chain Rule Circuit · Matrix Calculus Game 7';
    view = createWelcomeView({
      game,
      onStart:openLevel,
      onContinue:continueRound,
      onTutorial:() => { ui.view = 'tutorial'; render(); }
    });
  } else if (ui.view === 'tutorial') {
    document.title = `Tutorial ${ui.tutorialStep + 1} · Chain Rule Circuit`;
    view = createTutorialView({
      step:ui.tutorialStep,
      onStep:step => { ui.tutorialStep = step; render(); },
      onFinish:() => {
        game.tutorialCompleted = true;
        saveState(rootState);
        openLevel(1);
      }
    });
  } else if (ui.view === 'notebook') {
    document.title = 'Concept Notebook · Chain Rule Circuit';
    view = createNotebookView({ game, onOpenLevel:openLevel });
  } else if (ui.view === 'progress') {
    document.title = 'Progress · Chain Rule Circuit';
    view = createProgressView({
      game,
      onExport:() => exportState(rootState),
      onImport:handleImport,
      onReset:handleReset,
      onOpenLevel:openLevel
    });
  } else {
    const round = currentRound();
    const partial = game.currentRound?.partial ?? {};
    document.title = `Level ${round.level}: ${round.title} · Chain Rule Circuit`;
    view = createCircuitLabView({
      round,
      game,
      partial,
      stage:ui.stage,
      onPatch:patchPartial,
      onStage:moveStage,
      onSubmit:submit,
      onHint:hint,
      result:ui.result,
      hint:ui.hint,
      onSelectLevel:openLevel,
      onNext:() => openLevel(Math.min(22, round.level + 1)),
      onMode:openMode
    });
  }

  app.replaceChildren(view);
  typesetMath(app);
}

document.querySelectorAll('[data-nav]').forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.nav;
    if (target === 'game') continueRound();
    else {
      ui.view = target;
      render();
    }
    focusMain();
  });
});

document.getElementById('text-size-toggle')?.addEventListener('click', () => {
  rootState.learner.settings.largeText = !rootState.learner.settings.largeText;
  saveState(rootState);
  render();
});

document.getElementById('motion-toggle')?.addEventListener('click', () => {
  rootState.learner.settings.reducedMotion = !rootState.learner.settings.reducedMotion;
  saveState(rootState);
  render();
});

window.addEventListener('mathjax-ready', () => typesetMath(app), { once:true });

const requestedLevel = Number(new URLSearchParams(window.location.search).get('level'));
if (Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 22) {
  ui.round = roundForLevel(requestedLevel);
  engine.beginRound(ui.round);
  setInitialStage(ui.round);
  ui.view = 'game';
}

render();
