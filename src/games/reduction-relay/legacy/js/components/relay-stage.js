import {STAGES} from '../math/reduction-model.js';
export function stageLabel(id){return STAGES[id]?.label||id}
export function renderStages(stages,editable=false){
 if(!stages.length)return '<p class="empty-pipeline">No stages yet. Add the first station.</p>';
 return `<ol class="stage-list" aria-label="Ordered pipeline">${stages.map((s,i)=>`<li><span class="station">${stageLabel(s)}</span>${editable?`<span class="stage-actions"><button class="icon-btn" data-stage-action="left" data-index="${i}" aria-label="Move ${stageLabel(s)} left" ${i===0?'disabled':''}>←</button><button class="icon-btn" data-stage-action="right" data-index="${i}" aria-label="Move ${stageLabel(s)} right" ${i===stages.length-1?'disabled':''}>→</button><button class="icon-btn danger" data-stage-action="remove" data-index="${i}" aria-label="Remove ${stageLabel(s)}">×</button></span>`:''}</li>`).join('')}</ol>`;
}
