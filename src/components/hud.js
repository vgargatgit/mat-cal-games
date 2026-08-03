import { Button } from './button.js';
import { ProgressBar } from './progress-bar.js';
import { Stars } from './stars.js';
import { el } from '../utils/dom.js';

export function HUD({ game, stars, progress, muted, onHome, onRestart, onHint, onMute }) {
  return el('header', { className: 'hud' },
    el('div', { className: 'hud__identity' }, el('span', { className: 'hud__number' }, game.order), el('span', {}, el('strong', {}, game.title), el('small', {}, game.difficulty))),
    el('div', { className: 'hud__progress' }, ProgressBar(progress, `${game.title} campaign progress`), Stars(stars)),
    el('nav', { className: 'hud__actions', 'aria-label': 'Game controls' },
      Button('Home', { icon: '⌂', 'aria-label': 'Return to world map', onclick: onHome }),
      Button('Restart', { icon: '↻', onclick: onRestart }),
      Button('Hint', { icon: '?', onclick: onHint }),
      Button(muted ? 'Unmute' : 'Mute', { icon: muted ? '♪' : '♫', 'aria-pressed': String(muted), onclick: onMute })));
}
