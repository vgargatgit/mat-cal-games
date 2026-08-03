import { el, button } from '../components/dom.js';
import { overallMastery, strongestWeakness } from '../engine/mastery.js';
import { progressBar } from '../components/progress-bar.js';
import { MISCONCEPTIONS } from '../data/misconceptions.js';

export function progressView(state, actions) {
  const game = state.learner.games.partialDerivativeFreeze;
  const root = el('div', { className: 'progress-view shell-wide' });
  root.append(el('div', { className: 'section-heading' }, [el('div', { className: 'eyebrow', text: 'Learning telemetry' }), el('h1', { text: 'Progress and misconception dashboard' }), el('p', { text: 'Mastery is tracked by dependency skill, not only by the final expression.' })]));
  const overview = el('section', { className: 'dashboard-overview' });
  overview.append(progressBar(overallMastery(game.mastery), 'Overall mastery'), metric('Accuracy', game.progress.attempts ? `${Math.round(100 * game.progress.correct / game.progress.attempts)}%` : '—'), metric('Total score', String(game.progress.totalScore)), metric('Hints used', String(Object.values(game.mastery).reduce((n, item) => n + item.hintsUsed, 0))));
  root.append(overview);

  const weakness = strongestWeakness(game.mastery);
  const recommendation = el('section', { className: 'recommendation-card lab-card' });
  recommendation.append(el('h2', { text: 'Recommended review' }), el('p', { text: weakness ? recommendationText(weakness) : 'Complete a few rounds so the game can identify a targeted review pattern.' }));
  root.append(recommendation);

  const table = el('div', { className: 'mastery-table', role: 'table', 'aria-label': 'Mastery by concept' });
  table.append(row(['Concept', 'Attempts', 'Recent accuracy', 'State'], true));
  Object.entries(game.mastery).forEach(([id, item]) => {
    const accuracy = item.recentResults.length ? `${Math.round(100 * item.recentResults.filter(Boolean).length / item.recentResults.length)}%` : '—';
    table.append(row([humanize(id), String(item.attempts), accuracy, humanize(item.masteryState)]));
  });
  root.append(table);

  const settings = el('section', { className: 'settings-card lab-card' });
  settings.append(el('h2', { text: 'Accessibility and progress data' }));
  const reduced = settingToggle('Reduce motion', state.learner.settings.reducedMotion, (checked) => actions.updateSetting('reducedMotion', checked));
  const large = settingToggle('Larger interface text', state.learner.settings.largeText, (checked) => actions.updateSetting('largeText', checked));
  const exportButton = button('Export progress JSON', () => actions.exportProgress(), { className: 'button secondary' });
  const importLabel = el('label', { className: 'button secondary file-button' });
  importLabel.append(document.createTextNode('Import progress JSON'));
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json' });
  fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) actions.importProgress(file); });
  importLabel.append(fileInput);
  const reset = button('Reset all progress', () => actions.resetProgress(), { className: 'button danger' });
  settings.append(reduced, large, el('div', { className: 'settings-actions' }, [exportButton, importLabel, reset]));
  root.append(settings);
  return root;
}

function metric(label, value) { return el('div', { className: 'metric-card' }, [el('span', { text: label }), el('strong', { text: value })]); }
function humanize(value) { return String(value).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function row(values, header = false) { const node = el('div', { className: `mastery-row ${header ? 'header' : ''}`, role: 'row' }); values.forEach((value) => node.append(el(header ? 'strong' : 'span', { text: value, role: header ? 'columnheader' : 'cell' }))); return node; }
function settingToggle(labelText, checked, onChange) { const label = el('label', { className: 'setting-toggle' }); const input = el('input', { type: 'checkbox' }); input.checked = checked; input.addEventListener('change', () => onChange(input.checked)); label.append(input, el('span', { text: labelText })); return label; }
function recommendationText(id) { const title = MISCONCEPTIONS[id]?.title || humanize(id); const detail = MISCONCEPTIONS[id]?.feedback || 'Return to an earlier guided level.'; return `Review ${title.toLowerCase()}. ${detail}`; }
