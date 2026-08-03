import { el, button } from '../components/dom.js';
import { progressBar } from '../components/progress-bar.js';
import { overallMastery } from '../engine/mastery.js';
import { gameState } from '../state.js';

export function welcomeView(state, actions) {
  const game = gameState(state);
  const root = el('div', { className: 'welcome-view' });
  const hero = el('section', { className: 'welcome-hero' });
  const copy = el('div', { className: 'welcome-copy' });
  copy.append(
    el('div', { className: 'eyebrow', text: 'Matrix Calculus Game Suite · Game 2' }),
    el('h1', { text: 'Choose what changes. Freeze what does not.' }),
    el('p', { className: 'lead', text: 'A partial derivative follows one input while holding the other independent inputs fixed. Freeze the correct variables, trace what still changes, and build the derivative one rule at a time.' })
  );
  const actionsRow = el('div', { className: 'hero-actions' });
  actionsRow.append(button(game.progress.tutorialComplete ? 'Start a new lab round' : 'Start interactive tutorial', () => actions.start(), { className: 'button primary large' }));
  if (game.progress.attempts > 0) actionsRow.append(button('Continue current level', () => actions.continueGame(), { className: 'button secondary large' }));
  actionsRow.append(button('Open concept notebook', () => actions.navigate('notebook'), { className: 'button ghost large' }));
  copy.append(actionsRow);

  const visual = el('div', { className: 'freezer-illustration', 'aria-label': 'An active x moves while frozen y remains locked, and the product x squared y still changes.' });
  visual.append(
    el('div', { className: 'specimen active-specimen' }, [el('span', { text: 'x' }), el('small', { text: 'ACTIVE · allowed to move' })]),
    el('div', { className: 'lab-arrow', text: '→' }),
    el('div', { className: 'specimen frozen-specimen' }, [el('span', { text: 'y' }), el('small', { text: 'FROZEN · remains as multiplier' })]),
    el('div', { className: 'result-specimen' }, [el('strong', { text: '∂(x²y)/∂x = 2xy' }), el('small', { text: 'Frozen does not mean deleted.' })])
  );
  hero.append(copy, visual);

  const stats = el('section', { className: 'welcome-stats', 'aria-label': 'Learning progress summary' });
  stats.append(
    progressBar(overallMastery(game.mastery), 'Overall mastery'),
    metric('Current level', `${game.progress.currentLevel} / 12`),
    metric('Rounds solved', String(game.progress.correct)),
    metric('Best current streak', String(game.progress.streak))
  );

  const principles = el('section', { className: 'principle-grid' });
  principles.append(
    principle('↔', 'One active input', 'The derivative denominator identifies the variable allowed to change.'),
    principle('❄', 'Freeze independent inputs', 'Their values stay fixed during this local experiment.'),
    principle('×', 'Preserve multipliers', 'A frozen symbol can still scale a term that changes through the active input.'),
    principle('🔗', 'Trace declared dependencies', 'Total derivatives include indirect paths only when a relationship is declared.')
  );
  root.append(hero, stats, principles);
  return root;
}

function metric(label, value) {
  return el('div', { className: 'metric-card' }, [el('span', { text: label }), el('strong', { text: value })]);
}

function principle(icon, title, description) {
  return el('article', { className: 'principle-card' }, [el('span', { className: 'principle-icon', text: icon, 'aria-hidden': 'true' }), el('h2', { text: title }), el('p', { text: description })]);
}
