import { loadState, saveState, resetState, exportState, importState } from './storage.js';
import { GameEngine } from './engine/game-engine.js';
import { SAMPLE_ROUNDS } from './data/levels.js';
import { generateQuestion } from './engine/question-generator.js';
import { welcomeView } from './views/welcome-view.js';
import { tutorialView } from './views/tutorial-view.js';
import { gameView } from './views/game-view.js';
import { notebookView } from './views/notebook-view.js';
import { progressView } from './views/progress-view.js';
import { renderMath } from './math-renderer.js';
import { applySettings, announce, focusMain } from './accessibility.js';

let state = loadState();
let engine = new GameEngine(state);
let currentRound = resolveCurrentRound();
const app = document.getElementById('app');
applySettings(state.learner.settings);

window.addEventListener('hashchange', renderRoute);
window.addEventListener('error', (event) => console.error('Application error:', event.error || event.message));
window.addEventListener('unhandledrejection', (event) => console.error('Unhandled promise rejection:', event.reason));

const actions = {
  navigate(route) { window.location.hash = route; },
  start() {
    if (engine.game.progress.tutorialComplete) {
      currentRound = engine.nextRound(engine.game.progress.currentLevel);
      persist();
      window.location.hash = 'game';
    } else window.location.hash = 'tutorial';
  },
  continueGame() {
    currentRound = currentRound || engine.nextRound(engine.game.progress.currentLevel);
    persist();
    window.location.hash = 'game';
  },
  complete() {
    engine.game.progress.tutorialComplete = true;
    currentRound = engine.nextRound(1);
    persist();
    window.location.hash = 'game';
  },
  chooseLevel(level) {
    currentRound = engine.nextRound(level);
    persist();
    renderRoute();
  },
  next(level) {
    currentRound = engine.nextRound(level);
    persist();
    renderRoute();
    window.scrollTo({ top: 0, behavior: state.learner.settings.reducedMotion ? 'auto' : 'smooth' });
  },
  saveDraft(round, answer) {
    state.learner.games.partialDerivativeFreeze.currentAnswer = { roundId: round.id, ...answer, correct: false, savedAt: new Date().toISOString() };
    persist();
  },
  submit(round, answer) {
    const result = engine.submit(round, answer);
    persist();
    return result;
  },
  updateSetting(key, value) {
    state.learner.settings[key] = Boolean(value);
    applySettings(state.learner.settings);
    persist();
  },
  exportProgress() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'partial-derivative-freeze-progress.json'; anchor.click();
    URL.revokeObjectURL(url);
  },
  async importProgress(file) {
    try {
      const text = await file.text();
      state = importState(text);
      engine = new GameEngine(state);
      currentRound = resolveCurrentRound();
      applySettings(state.learner.settings);
      announce('Progress imported successfully.');
      renderRoute();
    } catch (error) {
      announce(`Import failed: ${error.message}`);
      window.alert(`Import failed: ${error.message}`);
    }
  },
  resetProgress() {
    const confirmed = window.confirm('Reset all Partial Derivative Freeze progress? This cannot be undone unless you exported a backup.');
    if (!confirmed) return;
    state = resetState();
    engine = new GameEngine(state);
    currentRound = null;
    applySettings(state.learner.settings);
    announce('Progress reset.');
    window.location.hash = 'welcome';
    renderRoute();
  }
};

function resolveCurrentRound() {
  const reference = state.learner.games.partialDerivativeFreeze.currentRound;
  if (!reference) return null;
  const sample = SAMPLE_ROUNDS.find((round) => round.id === reference.id);
  return sample || generateQuestion(reference.level, reference.seed, reference.weakness || null);
}

function persist() {
  state = saveState(state);
  engine = new GameEngine(state);
}

async function renderRoute() {
  const route = (window.location.hash || '#welcome').slice(1).split('?')[0];
  let view;
  if (route === 'tutorial') view = tutorialView(actions);
  else if (route === 'notebook') view = notebookView(actions);
  else if (route === 'progress') view = progressView(state, actions);
  else if (route === 'game') {
    currentRound = currentRound || engine.nextRound(engine.game.progress.currentLevel);
    persist();
    view = gameView(currentRound, state, actions);
  } else view = welcomeView(state, actions);
  app.replaceChildren(view);
  await renderMath(app);
  focusMain();
}

renderRoute();
