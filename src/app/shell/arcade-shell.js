import { Router } from '../router/router.js';
import { ProgressStore } from '../progress/progress-store.js';
import { AudioManager } from '../audio/audio-manager.js';
import { ThemeManager } from '../theme/theme-manager.js';
import { debugModeFromSearch, withoutDebugMode } from '../debug/debug-mode.js';
import { GAME_CATALOG } from '../../games/catalog.js';
import { Button } from '../../components/button.js';
import { Card } from '../../components/card.js';
import { Confetti } from '../../components/confetti.js';
import { HUD } from '../../components/hud.js';
import { LoadingScreen } from '../../components/loading-screen.js';
import { Modal } from '../../components/modal.js';
import { ProgressBar } from '../../components/progress-bar.js';
import { ResultScreen } from '../../components/result-screen.js';
import { Stars } from '../../components/stars.js';
import { Toast } from '../../components/toast.js';
import { clear, el } from '../../utils/dom.js';
import { InsideBackprop } from './inside-backprop.js';

const ENCYCLOPEDIA = [
  { id: 'derivative-shapes', title: 'Derivative shapes', requires: 'derivative shapes', definition: 'The derivative of m outputs with respect to n inputs has m rows and n columns.', example: 'f: ℝⁿ → ℝᵐ gives ∂f/∂x with shape m × n.', mistakes: 'Reversing the output and input dimensions.', games: ['Shape Sorter', 'Build the Jacobian'] },
  { id: 'partial-derivatives', title: 'Partial derivatives', requires: 'partial derivatives', definition: 'A partial derivative changes one independent input while holding the others fixed.', example: 'For f=x²y, ∂f/∂x=2xy when y is independent.', mistakes: 'Removing a frozen multiplier instead of preserving it.', games: ['Partial Derivative Freeze'] },
  { id: 'jacobians', title: 'Jacobians', requires: 'Jacobians', definition: 'A Jacobian arranges every scalar output sensitivity by output row and input column.', example: 'Jᵢⱼ = ∂yᵢ/∂xⱼ.', mistakes: 'Transposing rows and columns or confusing structural and evaluated zeros.', games: ['Build the Jacobian', 'Diagonal Detective', 'Jacobian Tetris'] },
  { id: 'broadcasting', title: 'Broadcasting', requires: 'broadcasting', definition: 'Broadcasting reuses one value across several output lanes, creating repeated dependency paths.', example: 'For y=x+b with scalar b and vector y, ∂y/∂b is a column of ones.', mistakes: 'Treating a shared scalar like an independent vector parameter.', games: ['Broadcast Factory'] },
  { id: 'reductions', title: 'Reductions', requires: 'reductions', definition: 'A reduction combines several input lanes into fewer outputs, often one scalar.', example: 'For s=Σᵢxᵢ, ∂s/∂x is a row of ones.', mistakes: 'Keeping the vector shape after the scalar finish or missing a mean factor.', games: ['Reduction Relay'] },
  { id: 'chain-rule', title: 'Chain rule', requires: 'chain rule', definition: 'Multiply local derivatives along each route and add the contributions of separate routes.', example: '∂y/∂x=(∂y/∂u)(∂u/∂x), with compatible inner dimensions.', mistakes: 'Reversing matrix order or adding serial factors.', games: ['Chain Rule Circuit', 'Jacobian Tetris'] },
  { id: 'relu', title: 'ReLU backward gate', requires: 'ReLU derivatives', definition: 'ReLU contributes a diagonal local Jacobian containing ones for positive pre-activations and zeros otherwise.', example: 'A zero diagonal entry blocks only its gradient lane.', mistakes: 'Using the ReLU output as its derivative or assuming a blocked gradient makes the weight zero.', games: ['ReLU Gatekeeper'] },
  { id: 'gradient-descent', title: 'Gradient descent', requires: 'gradient descent', definition: 'An optimizer subtracts a scaled parameter gradient to seek lower loss.', example: 'θ ← θ − η∇θL.', mistakes: 'Walking with the gradient, overshooting with η, or calling a plateau a minimum.', games: ['Gradient Descent Navigator'] },
  { id: 'backpropagation', title: 'Backpropagation', requires: 'complete backpropagation', definition: 'Backpropagation routes one incoming loss gradient through the transposed local Jacobians of a computation graph.', example: 'Linear → ReLU → linear → loss is the same chain rule practised earlier.', mistakes: 'Memorizing a formula while losing transpose, broadcast-reduction, or parameter-gradient structure.', games: ['Backpropagation Boss Battle'] },
];

export class ArcadeShell {
  constructor(root) {
    this.root = root;
    this.progress = new ProgressStore();
    this.audio = new AudioManager(this.progress.state.settings.muted);
    this.theme = new ThemeManager();
    this.router = new Router((route) => this.render(route));
    this.debugMode = debugModeFromSearch(window.location.search);
    this.activeModule = null;
    this.currentGame = null;
    this.freePlay = false;
    this.hintsUsed = 0;
    this.sessionStartedAt = 0;
  }

  start() {
    this.progress.begin();
    this.theme.apply(this.progress.state.settings);
    this.root.append(this.shell = el('div', { className: `arcade-shell${this.debugMode ? ' arcade-shell--debug' : ''}` },
      this.renderHeader(),
      this.main = el('main', { id: 'arcade-main', tabindex: '-1' }),
      el('div', { id: 'arcade-live', className: 'sr-only', 'aria-live': 'polite' })));
    this.toast = new Toast(this.shell);
    this.router.start();
  }

  destroy() {
    this.activeModule?.destroy(); this.router.destroy(); this.audio.destroy(); this.toast?.destroy();
  }

  renderHeader() {
    return el('header', { className: 'arcade-header' },
      el('div', { className: 'arcade-header__identity' },
        el('button', { type: 'button', className: 'arcade-brand', onclick: () => this.go('home'), 'aria-label': 'Matrix Calculus Arcade home' },
          el('span', { className: 'arcade-brand__mark', 'aria-hidden': 'true' }, '∂'),
          el('span', {}, el('strong', {}, 'Matrix Calculus Arcade'), el('small', {}, 'Learn the shape. Trace the flow.'))),
        this.debugMode ? el('span', { className: 'debug-badge', role: 'status' }, 'Debug · all levels open') : null),
      el('nav', { className: 'arcade-nav', 'aria-label': 'Arcade navigation' },
        this.navButton('World map', 'map'), this.navButton('Encyclopedia', 'encyclopedia'), this.navButton('Progress', 'progress'), this.navButton('Settings', 'settings')));
  }

  navButton(label, route) { return el('button', { type: 'button', dataset: { route }, onclick: () => this.go(route) }, label); }
  go(route) { this.audio.play('transition'); this.router.navigate(route); }

  async render(route) {
    this.activeModule?.destroy(); this.activeModule = null; this.currentGame = null;
    this.shell?.classList.toggle('arcade-shell--playing', route.name === 'game');
    clear(this.main);
    const views = { home: () => this.renderHome(), map: () => this.renderMap(route.id === 'free'), progress: () => this.renderProgress(), settings: () => this.renderSettings(), credits: () => this.renderCredits(), encyclopedia: () => this.renderEncyclopedia(), mastery: () => this.renderMastery(), 'inside-backprop': () => this.renderInsideBackprop() };
    if (route.name === 'game') await this.renderGame(route.id);
    else (views[route.name] ?? views.home)();
    this.main.focus({ preventScroll: true });
  }

  renderHome() {
    const state = this.progress.state;
    const completed = state.completedGames.length;
    this.main.append(el('section', { className: 'home-screen' },
      el('div', { className: 'home-screen__glow', 'aria-hidden': 'true' }),
      el('div', { className: 'home-screen__copy' },
        el('p', { className: 'eyebrow' }, 'Eleven games · Three connected chapters'),
        el('h1', {}, 'Matrix Calculus', el('span', {}, 'Arcade')),
        el('p', { className: 'home-screen__subtitle' }, 'Learn the rules of matrix calculus, then use them to reconstruct neural-network training from first principles.'),
        el('div', { className: 'home-actions' },
          Button(completed ? 'Continue journey' : 'Start journey', { kind: 'primary', onclick: () => this.continueJourney() }),
          Button('New game', { onclick: () => this.confirmNewGame() }),
          Button('Free play', { onclick: () => this.go('map/free') })),
        el('div', { className: 'home-links' },
          this.textLink('Progress', 'progress'), this.textLink('Settings', 'settings'), this.textLink('Credits', 'credits'))),
      el('aside', { className: 'home-screen__cabinet', 'aria-label': `${completed} of ${GAME_CATALOG.length} games complete` },
        el('span', { className: 'cabinet-symbol', 'aria-hidden': 'true' }, 'J'),
        el('strong', {}, `${completed}/${GAME_CATALOG.length}`), el('span', {}, 'modules cleared'),
        ProgressBar((completed / GAME_CATALOG.length) * 100, 'Arcade completion'))));
  }

  textLink(label, route) { return el('button', { type: 'button', className: 'text-link', onclick: () => this.go(route) }, label); }

  continueJourney() {
    const next = GAME_CATALOG.findIndex((game) => !this.progress.state.completedGames.includes(game.id));
    const index = next < 0 ? GAME_CATALOG.length - 1 : Math.min(next, this.progress.state.unlockedLevel);
    this.go(`game/${GAME_CATALOG[index].id}`);
  }

  confirmNewGame() {
    Modal({ title: 'Start a new journey?', content: el('p', {}, 'Arcade progress, stars, achievements, and individual campaign history will reset on this device.'), actions: [
      Button('Cancel', { onclick: () => document.querySelector('dialog[open]')?.close() }),
      Button('Start new game', { kind: 'danger', onclick: () => { GAME_CATALOG.forEach((game) => localStorage.removeItem(game.storageKey)); this.progress.newGame(); document.querySelector('dialog[open]')?.close(); this.renderHome(); } }),
    ] });
  }

  renderMap(freePlay = false) {
    this.freePlay = freePlay;
    const bypassLocks = freePlay || this.debugMode;
    const state = this.progress.state;
    const nodes = GAME_CATALOG.flatMap((game, index) => {
      const unlocked = this.progress.isUnlocked(index, bypassLocks);
      const completed = state.completedGames.includes(game.id);
      const node = el('article', { className: `map-node ${completed ? 'map-node--complete' : ''} ${unlocked ? '' : 'map-node--locked'}` },
        el('div', { className: 'map-node__icon', 'aria-hidden': 'true' }, unlocked ? game.icon : '·'),
        el('div', { className: 'map-node__copy' }, el('span', { className: 'eyebrow' }, `${game.order} · ${game.difficulty}`), el('h2', {}, game.title), el('p', {}, game.description), Stars(state.stars[game.id] ?? 0)),
        Button(completed ? 'Replay' : unlocked ? 'Play' : 'Locked', { kind: unlocked ? 'primary' : 'secondary', disabled: !unlocked, 'aria-label': `${unlocked ? 'Play' : 'Locked'} ${game.title}`, onclick: () => { if (unlocked) this.go(`game/${game.id}`); } }));
      const before = index === 8 ? [el('section', { className: 'chapter-divider' }, el('p', { className: 'eyebrow' }, 'Graduation unlocked'), el('h2', {}, 'Chapter III — Learning to Train a Network'), el('p', {}, 'The rules are restored. Now use them to repair an ancient neural network.'))] : [];
      return [...before, node, ...(index === GAME_CATALOG.length - 1 ? [] : [el('div', { className: 'map-path', 'aria-hidden': 'true' }, '↓')])];
    });
    const title = this.debugMode ? 'Debug Map' : freePlay ? 'Free Play' : 'World Map';
    const subtitle = this.debugMode
      ? 'Every cabinet and laboratory is open. Debug runs do not advance journey progress.'
      : freePlay ? 'Every cabinet is open. Free Play does not bypass or alter your journey progress.' : 'Clear a module to unlock the next stop.';
    this.main.append(el('section', { className: 'page world-map' },
      this.pageHeading(title, subtitle),
      this.debugMode ? Button('Exit debug mode', { onclick: () => window.location.assign(withoutDebugMode(window.location.href)) })
        : freePlay ? Button('Return to journey map', { onclick: () => this.go('map') }) : Button('Open Free Play', { onclick: () => this.go('map/free') }),
      el('div', { className: 'map-route' }, ...nodes)));
  }

  async renderGame(id) {
    const index = GAME_CATALOG.findIndex((entry) => entry.id === id);
    const game = GAME_CATALOG[index];
    if (!game || !this.progress.isUnlocked(index, this.freePlay || this.debugMode)) { this.go('map'); return; }
    this.currentGame = game; this.hintsUsed = 0; this.sessionStartedAt = Date.now();
    this.main.append(this.gameView = el('section', { className: 'game-view' },
      HUD({ game, stars: this.progress.state.stars[game.id] ?? 0, progress: 0, muted: this.audio.muted,
        onHome: () => this.go('map'), onRestart: () => this.restartGame(), onHint: () => this.requestHint(), onMute: () => this.toggleMute() }),
      this.gameHost = el('div', { className: 'game-host' }, LoadingScreen(game.title))));
    try {
      this.activeModule = await game.load();
      if (this.currentGame?.id !== id) return;
      this.activeModule.create(this.gameHost, {
        hintsUsed: () => this.hintsUsed,
        onHint: () => { this.hintsUsed += 1; this.progress.addHint(); },
        onReady: () => this.audio.play('click'),
        onCorrect: () => this.audio.play('correct'),
        onIncorrect: () => this.audio.play('incorrect'),
        onProgress: (value) => this.updateGameProgress(value),
        onComplete: (result) => this.handleComplete(game, index, result),
      });
    } catch (error) {
      this.gameHost.replaceChildren(Card(el('h2', {}, 'This cabinet could not load'), el('p', {}, error.message), Button('Return to map', { onclick: () => this.go('map') })));
    }
  }

  updateGameProgress({ completed, total }) {
    const value = Math.round((completed / total) * 100);
    const bar = this.gameView?.querySelector('.hud .progress-bar');
    if (bar) { bar.setAttribute('aria-valuenow', String(value)); bar.querySelector('span').style.width = `${value}%`; }
  }

  handleComplete(game, index, result) {
    if (this.progress.state.completedGames.includes(game.id)) return;
    if (!this.debugMode) {
      this.progress.state.stats.totalPlaySeconds += Math.max(0, Math.round((Date.now() - this.sessionStartedAt) / 1000));
      this.progress.completeGame(game, index, result);
    }
    this.audio.play('victory'); Confetti(this.main);
    this.activeModule?.pause();
    setTimeout(() => {
      this.activeModule?.destroy(); this.activeModule = null;
      this.main.replaceChildren(ResultScreen(game, result, {
        onMap: () => this.go('map'),
        onContinue: () => game.finale ? this.go('mastery') : this.go(`game/${GAME_CATALOG[index + 1].id}`),
      }));
    }, 500);
  }

  restartGame() { this.audio.play('click'); this.activeModule?.restart(); this.hintsUsed = 0; }
  requestHint() {
    if (this.activeModule?.hint()) this.audio.play('click');
    else this.toast.show('Open a round first, then the shared Hint control will reveal its next staged hint.');
  }
  toggleMute() {
    this.audio.setMuted(!this.audio.muted); this.progress.updateSettings({ muted: this.audio.muted });
    const button = [...this.gameView.querySelectorAll('.hud button')].find((item) => /mute/i.test(item.textContent));
    if (button) button.querySelector('span:last-child').textContent = this.audio.muted ? 'Unmute' : 'Mute';
  }

  renderProgress() {
    const state = this.progress.state;
    const percent = Math.round((state.completedGames.length / GAME_CATALOG.length) * 100);
    this.main.append(el('section', { className: 'page' }, this.pageHeading('Progress', 'Your journey is stored only in this browser.'),
      el('div', { className: 'stats-grid' },
        metric(`${percent}%`, 'overall mastery'), metric(`${state.completedGames.length}/${GAME_CATALOG.length}`, 'games complete'), metric(Object.values(state.stars).reduce((sum, value) => sum + Number(value || 0), 0), 'stars earned'), metric(Object.keys(state.achievements).length, 'achievements')),
      Card(el('h2', {}, 'Overall mastery'), ProgressBar(percent, 'Overall mastery'), el('p', {}, `${state.completedConcepts.length} concepts reinforced across the arcade.`)),
      el('section', { className: 'achievement-section' }, el('h2', {}, 'Achievements'),
        el('div', { className: 'badge-grid' }, ...['Shape Master', 'Broadcast Hero', 'Reduction Wizard', 'Jacobian Genius', 'Chain Rule Master', 'Gatekeeper', 'Descent Navigator', 'Backprop Boss', 'Backpropagation Rebuilt', 'Perfect Game', 'Speed Runner', 'No Hints Used'].map((name) => el('div', { className: `badge ${state.achievements[name] ? 'badge--earned' : ''}` }, el('span', { 'aria-hidden': 'true' }, state.achievements[name] ? '◆' : '◇'), el('strong', {}, name)))))));
  }

  renderSettings() {
    const settings = this.progress.state.settings;
    const form = el('form', { className: 'settings-card' },
      setting('Mute arcade sounds', 'muted', settings.muted),
      setting('Reduce motion', 'reducedMotion', settings.reducedMotion),
      setting('High contrast', 'highContrast', settings.highContrast),
      el('label', { className: 'setting-row' }, el('span', {}, el('strong', {}, 'Theme'), el('small', {}, 'Choose the arcade shell appearance.')), el('select', { name: 'theme' }, option('light', settings.theme), option('dark', settings.theme))));
    form.addEventListener('change', () => {
      const data = new FormData(form);
      const next = { muted: data.has('muted'), reducedMotion: data.has('reducedMotion'), highContrast: data.has('highContrast'), theme: data.get('theme') };
      this.progress.updateSettings(next); this.audio.setMuted(next.muted); this.theme.apply(next); this.toast.show('Settings saved.');
    });
    this.main.append(el('section', { className: 'page' }, this.pageHeading('Settings', 'Accessibility and comfort preferences apply across the arcade.'), form));
  }

  renderEncyclopedia() {
    const unlocked = new Set(this.progress.state.completedConcepts);
    this.main.append(el('section', { className: 'page' }, this.pageHeading('Concept Encyclopedia', 'Entries unlock as you clear related games.'),
      el('div', { className: 'encyclopedia-grid' }, ...ENCYCLOPEDIA.map((entry, index) => {
        const open = this.debugMode || unlocked.has(entry.requires) || index === 0;
        return Card(el('p', { className: 'eyebrow' }, open ? 'Unlocked' : 'Locked'), el('h2', {}, open ? entry.title : 'Unknown concept'),
          open ? el('div', {}, el('p', {}, entry.definition), el('h3', {}, 'Example'), el('p', {}, entry.example), el('h3', {}, 'Common mistake'), el('p', {}, entry.mistakes), el('p', {}, el('strong', {}, 'Related games: '), entry.games.join(', ')), el('a', { href: 'https://explained.ai/matrix-calculus/', target: '_blank', rel: 'noreferrer' }, 'Paper reference ↗')) : el('p', {}, `Clear ${entry.games[0]} to unlock this entry.`));
      }))));
  }

  renderMastery() {
    const state = this.progress.state;
    if (state.completedGames.length < GAME_CATALOG.length) { this.go('map'); return; }
    const stars = Object.values(state.stars).reduce((sum, value) => sum + Number(value || 0), 0);
    this.main.append(el('section', { className: 'mastery-screen' },
      el('p', { className: 'eyebrow' }, 'Journey complete'), el('h1', {}, 'Matrix Calculus Mastery'),
      el('p', { className: 'mastery-screen__lead' }, 'You connected derivative shapes, local Jacobians, activation gates, gradient descent, and a complete backward pass into one working model of neural-network training.'),
      el('div', { className: 'stats-grid' }, metric(`${GAME_CATALOG.length}/${GAME_CATALOG.length}`, 'games complete'), metric(`${stars}/${GAME_CATALOG.length * 3}`, 'stars earned'), metric(state.completedConcepts.length, 'concepts reinforced'), metric(Object.keys(state.achievements).length, 'achievements')),
      el('div', { className: 'mastery-chain' }, ...['Forward pass', 'Local Jacobians', 'Backward pass', 'Parameter gradients', 'Weight update', 'Lower loss'].map((name, index) => el('span', {}, name, index < 5 ? el('i', { 'aria-hidden': 'true' }, '→') : null))),
      el('p', {}, 'You did not memorize backpropagation. You reconstructed it from rules you already understood.'),
      el('div', { className: 'button-row' }, Button('Inside Backpropagation', { onclick: () => this.go('inside-backprop') }), Button('Review encyclopedia', { onclick: () => this.go('encyclopedia') }), Button('Return to arcade', { kind: 'primary', onclick: () => this.go('home') }))));
    Confetti(this.main);
  }

  renderCredits() {
    this.main.append(el('section', { className: 'page narrow' }, this.pageHeading('Credits', 'Built as one learning journey from eight original games and a native backpropagation trilogy.'),
      Card(el('h2', {}, 'Learning foundation'), el('p', {}, 'Inspired by “The Matrix Calculus You Need for Deep Learning” by Terence Parr and Jeremy Howard.'), el('a', { href: 'https://explained.ai/matrix-calculus/', target: '_blank', rel: 'noreferrer' }, 'Read the paper ↗')),
      Card(el('h2', {}, 'Source games'), el('p', {}, GAME_CATALOG.map((game) => game.title).join(' · '))),
      Button('Back home', { kind: 'primary', onclick: () => this.go('home') })));
  }

  renderInsideBackprop() {
    if (!this.debugMode && !this.progress.state.completedGames.includes('backpropagation-boss')) { this.go('map'); return; }
    this.main.append(InsideBackprop(() => this.go('mastery')));
  }

  pageHeading(title, subtitle) { return el('header', { className: 'page-heading' }, el('p', { className: 'eyebrow' }, 'Matrix Calculus Arcade'), el('h1', {}, title), el('p', {}, subtitle)); }
}

function metric(value, label) { return el('div', { className: 'metric' }, el('strong', {}, String(value)), el('span', {}, label)); }
function setting(label, name, checked) { return el('label', { className: 'setting-row' }, el('span', {}, el('strong', {}, label), el('small', {}, 'Persisted on this device.')), el('input', { type: 'checkbox', name, checked })); }
function option(value, selected) { return el('option', { value, selected: value === selected }, value[0].toUpperCase() + value.slice(1)); }
