import { el } from '../components/dom.js';
import { CONCEPTS } from '../data/concepts.js';

function masteryBadge(game, conceptId) {
  const record = game?.mastery?.[conceptId];
  if (!record || record.masteryState === 'not-introduced') return el('span', { className:'badge', text:'Not introduced' });
  if (record.masteryState === 'mastered') return el('span', { className:'badge good', text:'Mastered' });
  return el('span', { className:'badge info', text:record.masteryState });
}

export function createNotebookView({ game, onOpenLevel }) {
  const shell = el('div', { className:'shell' },
    el('div', { className:'view-heading' },
      el('div', {},
        el('span', { className:'kicker', text:'Concept notebook' }),
        el('h1', { text:'Circuit schematics' }),
        el('p', { text:'Definitions, derivative shapes, worked circuits, and the misconception each schematic is designed to prevent.' })
      )
    ),
    el('div', { className:'callout info' },
      el('strong', { text:'Reading key: ' }),
      'orange solid arrows are forward dependencies, purple labels are local derivatives, blue dashed arrows are backward gradients, and green junctions add returning contributions.'
    )
  );

  const grid = el('div', { className:'notebook-grid' });
  CONCEPTS.forEach(item => {
    grid.append(el('article', { className:'card concept-card' },
      el('div', { className:'panel-header' },
        el('span', { className:'badge info', text:`Level ${item.level}` }),
        masteryBadge(game, item.id)
      ),
      el('h2', { text:item.title }),
      el('p', { text:item.definition }),
      el('div', { className:'equation', text:`\\[${item.equation}\\]` }),
      el('pre', { className:'concept-diagram', text:item.diagram, 'aria-label':`${item.title} text circuit diagram` }),
      el('p', {}, el('strong', { text:'Shape: ' }), item.shape),
      el('p', {}, el('strong', { text:'Worked example: ' }), item.example),
      el('div', { className:'callout warning' }, el('strong', { text:'Common circuit fault: ' }), item.misconception),
      el('button', { className:'btn small', onClick:() => onOpenLevel(item.level), text:`Practise in Level ${item.level} →` })
    ));
  });
  shell.append(grid);
  return shell;
}
