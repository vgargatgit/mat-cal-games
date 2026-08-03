import { el } from '../components/dom.js';
import { overallMastery } from '../state.js';
import { LEVELS } from '../data/levels.js';
import { recommendedReview } from '../engine/mastery.js';

function mostFrequentMisconception(game) {
  const entries = Object.entries(game.misconceptions ?? {}).sort(([, a], [, b]) => b - a);
  return entries[0] ?? null;
}

export function createProgressView({ game, onExport, onImport, onReset, onOpenLevel }) {
  const mastery = overallMastery(game);
  const recommended = recommendedReview(game);
  const frequent = mostFrequentMisconception(game);
  const shell = el('div', { className:'shell' },
    el('div', { className:'view-heading' },
      el('div', {},
        el('span', { className:'kicker', text:'Progress dashboard' }),
        el('h1', { text:'Signal diagnostics' }),
        el('p', { text:'Each reasoning channel is tracked separately so the next practice circuit can target the first weak connection.' })
      )
    )
  );

  shell.append(el('section', { className:'grid-4', 'aria-label':'Progress summary' },
    el('div', { className:'metric' },
      el('span', { text:'Overall mastery' }),
      el('strong', { text:`${mastery}%` }),
      el('div', { className:'progress-track' }, el('div', { className:'progress-fill', style:`width:${mastery}%` }))
    ),
    el('div', { className:'metric' }, el('span', { text:'Levels completed' }), el('strong', { text:`${game.progress.completedLevels.length}/22` })),
    el('div', { className:'metric' }, el('span', { text:'Signal points' }), el('strong', { text:String(game.progress.score) })),
    el('div', { className:'metric' }, el('span', { text:'Best circuit streak' }), el('strong', { text:String(game.progress.bestStreak) }))
  ));

  shell.append(el('section', { className:'card stack', style:'margin-top:1rem' },
    el('div', { className:'panel-header' },
      el('div', {}, el('span', { className:'kicker', text:'Adaptive recommendation' }), el('h2', { text:`Review ${recommended.replaceAll('-', ' ')}` })),
      el('button', {
        className:'btn blue small',
        onClick:() => {
          const level = LEVELS.find(item => item.concept === recommended)?.level ?? 1;
          onOpenLevel(level);
        },
        text:'Open review circuit →'
      })
    ),
    el('div', { className:'callout info' },
      frequent
        ? `Most frequent diagnostic: ${frequent[0].replaceAll('-', ' ')} (${frequent[1]} recorded).`
        : 'No repeated misconception has been recorded yet. Complete a few circuits to unlock a targeted recommendation.'
    )
  ));

  const masteryGrid = el('div', { className:'mastery-grid' });
  Object.entries(game.mastery).forEach(([id, record]) => {
    const accuracy = record.attempts ? Math.round(record.correct / record.attempts * 100) : 0;
    masteryGrid.append(el('div', { className:'mastery-row' },
      el('header', {}, el('strong', { text:id.replaceAll('-', ' ') }), el('span', { className:`badge ${accuracy >= 80 ? 'good' : 'info'}`, text:`${accuracy}%` })),
      el('div', { className:'progress-track' }, el('div', { className:'progress-fill', style:`width:${accuracy}%` })),
      el('small', { text:`${record.attempts} attempts · ${record.masteryState}` })
    ));
  });
  shell.append(el('section', { className:'card stack', style:'margin-top:1rem' },
    el('div', { className:'panel-header' },
      el('div', {}, el('span', { className:'kicker', text:'Skill channels' }), el('h2', { text:'Mastery by reasoning stage' })),
      el('span', { className:'badge info', text:'Recent accuracy' })
    ),
    masteryGrid
  ));

  const importLabel = el('label', { className:'btn secondary', text:'Import progress' });
  importLabel.append(el('input', { type:'file', accept:'application/json', className:'sr-only', onChange:event => onImport(event.target.files[0]) }));

  const levelMap = el('div', { className:'level-map' });
  LEVELS.forEach(level => {
    const complete = game.progress.completedLevels.includes(level.level);
    levelMap.append(el('button', {
      className:`level-map-button ${complete ? 'complete' : ''}`,
      onClick:() => onOpenLevel(level.level),
      'aria-label':`Open level ${level.level}, ${level.title}${complete ? ', complete' : ''}`
    },
    el('span', { className:'level-num', text:complete ? '✓' : String(level.level) }),
    el('span', { text:level.title }),
    el('span', { text:'→', 'aria-hidden':'true' })
    ));
  });

  shell.append(el('section', { className:'card stack', style:'margin-top:1rem' },
    el('div', { className:'panel-header' },
      el('div', {}, el('span', { className:'kicker', text:'Progress data' }), el('h2', { text:'Backup and level map' })),
      el('span', { className:'badge', text:'Schema v1' })
    ),
    el('p', { text:'Export a portable JSON backup, restore a validated backup, or reset this game. Imported data is checked before it replaces local progress.' }),
    el('div', { className:'button-row' },
      el('button', { className:'btn', onClick:onExport, text:'Export progress' }),
      importLabel,
      el('button', { className:'btn danger', onClick:onReset, text:'Reset progress' })
    ),
    el('h3', { text:'Level map' }),
    levelMap
  ));

  return shell;
}
