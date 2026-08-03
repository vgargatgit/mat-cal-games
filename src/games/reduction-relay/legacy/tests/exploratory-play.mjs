import {LEVELS} from '../js/data/levels.js';
import {SAMPLE_ROUNDS} from '../js/data/sample-rounds.js';
import {generateQuestion} from '../js/engine/question-generator.js';
import {evaluateFamily} from '../js/math/numeric-evaluator.js';
import {gradientFor} from '../js/math/symbolic-derivative.js';
import {expectedGradient,expectedIntermediates,expectedStageShapes} from '../js/engine/answer-validator.js';
import {computeAxisReduction} from '../js/math/reduction-model.js';

const endpoint=process.argv[2]||'http://127.0.0.1:9225';
const gameUrl=process.argv[3]||'http://localhost:8090/';
const tabs=await (await fetch(`${endpoint}/json`)).json(),tab=tabs.find(value=>value.type==='page');if(!tab)throw new Error('No browser page');
const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map(),exceptions=[];socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text);if(message.id&&pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,message=>message.error?reject(new Error(message.error.message)):resolve(message.result));socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>(await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
const setValue=(selector,value)=>evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return false;element.value=${JSON.stringify(String(value))};element.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const clearStages=async()=>{while(await evaluate(`document.querySelectorAll('.stage-list li').length`))await click('[data-stage-action="remove"][data-index="0"]');};
const fillRound=async q=>{
  await clearStages();
  if(q.family==='dot')await click('[data-stage="dot"]');else for(const stage of q.stages)await click(`[data-stage="${stage}"]`);
  const shapes=expectedStageShapes(q);for(let i=0;i<shapes.length;i++)await setValue(`[data-array="shapes"][data-index="${i}"]`,shapes[i]);
  const intermediates=expectedIntermediates(q);for(let row=0;row<intermediates.length;row++)for(let i=0;i<intermediates[row].length;i++)await setValue(`[data-array="intermediates"][data-row="${row}"][data-index="${i}"]`,intermediates[row][i]);
  if(q.axisChallenge){const output=computeAxisReduction(q.axisChallenge.matrix,q.axisChallenge.axis),shape=q.axisChallenge.axis==='rows'?`${q.axisChallenge.matrix.length}×1`:q.axisChallenge.axis==='columns'?`1×${q.axisChallenge.matrix[0].length}`:'scalar';await setValue('[data-field="axisChoice"]',q.axisChallenge.axis);await setValue('[data-field="axisShape"]',shape);await setValue('[data-field="axisOutput"]',Array.isArray(output)?`[${output}]`:output);}
  if(q.comparison==='sum-mean'){const sum=q.x.reduce((a,b)=>a+b,0);await setValue('[data-field="comparisonSum"]',sum);await setValue('[data-field="comparisonMean"]',sum/q.x.length);await setValue('[data-field="comparisonSumGradient"]',`[${Array(q.x.length).fill(1)}]`);await setValue('[data-field="comparisonMeanGradient"]',`[${Array(q.x.length).fill(1/q.x.length)}]`);}
  await setValue('[data-field="scalar"]',evaluateFamily(q.family,q));await setValue('[data-field="derivativeShape"]',`1×${q.x.length}`);await setValue('[data-field="localGradient"]',`[${gradientFor(q).values.join(',')}]`);await setValue('[data-field="finalGradient"]',`[${expectedGradient(q).join(',')}]`);
};
await call('Runtime.enable');await call('Page.navigate',{url:gameUrl});await new Promise(resolve=>setTimeout(resolve,800));
const failures=[],observations=[];
await click('[data-action="start"]');
for(const level of LEVELS){
  await click('[data-action="levels"]');await click(`[data-level="${level.id}"]`);
  const source=SAMPLE_ROUNDS.find(round=>round.level===level.id)||generateQuestion(level,1000+level.id,'guided'),q={...source,comparison:level.id===5?'sum-mean':source.comparison??null};
  await fillRound(q);await click('[data-action="check"]');
  const correct=await evaluate(`Boolean(document.querySelector('.feedback.correct'))`);if(!correct)failures.push(`Level ${level.id} guided round did not complete with engine-derived answers`);
  const displayedTarget=await evaluate(`document.querySelector('[data-field="target"]')?.value`);if(q.target&&displayedTarget!==q.target)observations.push(`Level ${level.id}: target is ${q.target}, UI displays ${displayedTarget}`);
  await click('[data-round="repair"]');const repairQ=generateQuestion(level,1200+level.id,'repair'),repair=await evaluate(`({notice:Boolean(document.querySelector('.repair-note')),type:document.querySelector('.repair-note')?.textContent})`);if(!repair.notice)failures.push(`Level ${level.id} repair mode has no visible faulty checkpoint`);else observations.push(repair.type);await click('[data-action="check"]');if(!await evaluate(`Boolean(document.querySelector('.feedback.incorrect'))`))failures.push(`Level ${level.id} supplied repair state is not actually faulty`);await fillRound(repairQ);await click('[data-action="check"]');if(!await evaluate(`Boolean(document.querySelector('.feedback.correct'))`))failures.push(`Level ${level.id} repair cannot be completed after fixing the supplied fault`);
  await click('[data-round="mastery"]');const masteryScaffolding=await evaluate(`({tiles:document.querySelectorAll('[data-tile]').length,hint:Boolean(document.querySelector('[data-action="hint"]'))})`);await click('[data-round="practice"]');const practiceScaffolding=await evaluate(`({tiles:document.querySelectorAll('[data-tile]').length,hint:Boolean(document.querySelector('[data-action="hint"]'))})`);if(masteryScaffolding.tiles||masteryScaffolding.hint||!practiceScaffolding.tiles||!practiceScaffolding.hint)failures.push(`Level ${level.id}: mastery scaffolding is not reduced`);
}
const edgeFindings={};
await click('[data-action="levels"]');await click('[data-level="4"]');await click('[data-stage="mean"]');
edgeFindings.shapeAnswerVisibleBeforePrediction=(await evaluate(`document.querySelector('.text-alt')?.textContent`))||'';
await setValue('[data-array="shapes"][data-index="0"]','scalar');await setValue('[data-field="scalar"]','4');await setValue('[data-field="derivativeShape"]','1×3');
for(let i=0;i<3;i++)await click('[data-tile="1/3"]');
edgeFindings.symbolicTileValue=await evaluate(`document.querySelector('[data-field="localGradient"]')?.value`);
await setValue('[data-field="finalGradient"]','[0.3333333333333333,0.3333333333333333,0.3333333333333333]');await click('[data-action="check"]');
edgeFindings.symbolicTileAccepted=await evaluate(`Boolean(document.querySelector('.feedback.correct'))`);edgeFindings.symbolicTileFeedback=await evaluate(`document.querySelector('.feedback')?.textContent`);
await setValue('[data-field="scalar"]','123');await call('Page.reload');await new Promise(resolve=>setTimeout(resolve,500));await click('[data-action="start"]');edgeFindings.partialScalarRestored=await evaluate(`document.querySelector('[data-field="scalar"]')?.value`);
await click('[data-view="tutorial"]');edgeFindings.tutorialLearnerInputs=await evaluate(`document.querySelectorAll('[data-tutorial-answer]').length`);for(let step=0;step<9;step++){const count=await evaluate(`document.querySelectorAll('[data-tutorial-answer]').length`);let unlocked=false;for(let i=0;i<count;i++){await evaluate(`document.querySelectorAll('[data-tutorial-answer]')[${i}]?.click()`);unlocked=await evaluate(`!document.querySelector('[data-action="next-tutorial"]')?.disabled`);if(unlocked)break;}if(!unlocked){failures.push(`Tutorial step ${step+1} cannot be answered`);break;}await click('[data-action="next-tutorial"]');}edgeFindings.tutorialCompletesToGame=await evaluate(`Boolean(document.querySelector('.relay-workspace'))`);
await click('[data-view="game"]');await click('[data-action="levels"]');await click('[data-level="5"]');edgeFindings.level5HasInteractiveComparison=await evaluate(`Boolean(document.querySelector('.concept-contrast, .comparison-manifest'))`);
console.log(JSON.stringify({guidedCompleted:20-failures.filter(x=>x.includes('guided')).length,failures,observations,edgeFindings,exceptions},null,2));socket.close();if(failures.length||exceptions.length)process.exitCode=1;
