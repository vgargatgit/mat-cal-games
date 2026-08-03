import { CONCEPTS } from '../data/concepts.js';

export function createNotebookView({game,onOpenLevel}){
  const page=document.createElement('div');page.className='page';
  page.innerHTML=`<div class="page-heading"><div><span class="kicker">Concept notebook</span><h1>Agency field notes</h1><p>Definitions, dependency diagrams, structural matrices, examples, and recurring traps.</p></div><span class="badge info">${game.conceptDiscoveries.length} discoveries</span></div><div class="notebook-grid"></div>`;
  const grid=page.querySelector('.notebook-grid');
  CONCEPTS.forEach(concept=>{const card=document.createElement('article');card.className='card concept-card';card.innerHTML=`<span class="kicker">Level ${concept.level}</span><h2>${concept.title}</h2><p>${concept.definition}</p><div class="concept-diagram" aria-label="Dependency diagram">${concept.diagram}</div><div class="callout"><strong>Structural clue:</strong> ${concept.matrix}</div><p><strong>Example:</strong> ${concept.example}</p><p><strong>Common misconception:</strong> ${concept.misconception}</p><button class="btn secondary small">Open related level</button>`;card.querySelector('button').addEventListener('click',()=>onOpenLevel(concept.level));grid.append(card);});
  return page;
}
