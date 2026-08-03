import {store} from './state.js?v=20260802-1';
import {LEVELS} from './data/levels.js';
import {SAMPLE_ROUNDS} from './data/sample-rounds.js';
import {CONCEPTS} from './data/concepts.js';
import {MISCONCEPTIONS} from './data/misconceptions.js';
import {welcomeView} from './views/welcome-view.js';
import {tutorialView,isTutorialAnswerCorrect} from './views/tutorial-view.js?v=20260803-1';
import {relayView} from './views/relay-view.js?v=20260802-3';
import {progressView} from './views/progress-view.js';
import {generateQuestion} from './engine/question-generator.js?v=20260802-3';
import {validateRelay,classifyReductionMisconception,expectedIntermediates,expectedStageShapes,expectedGradient} from './engine/answer-validator.js?v=20260802-3';
import {evaluateFamily} from './math/numeric-evaluator.js';
import {gradientFor} from './math/symbolic-derivative.js';
import {computeAxisReduction} from './math/reduction-model.js';
import {scoreRound,recordComponentScores} from './engine/scoring.js';
import {updateMastery} from './engine/mastery.js?v=20260802-3';
import {feedbackHTML} from './components/feedback-panel.js';
import {renderMath} from './math-renderer.js';
import {announce} from './accessibility.js';
import {resetState,exportState,importState} from './storage.js';

const app=document.getElementById('app');let tutorialStep=0,tutorialFeedback='',feedback='';const tutorialCompletedSteps=new Set();
let session={roundType:'guided',stages:[],shapes:[],intermediates:[],scalar:'',derivativeShape:'',localGradient:'',finalGradient:'',attempts:0,hints:0,target:'x'};
const game=()=>store.game;
const currentLevel=()=>LEVELS.find(l=>l.id===game().progress.currentLevel)||LEVELS[0];
function baseQuestion(){const level=currentLevel(),type=session.roundType||'guided';if(type==='guided'){const sample=SAMPLE_ROUNDS.find(q=>q.level===level.id);if(sample)return {...sample,comparison:level.id===5?'sum-mean':sample.comparison??null};}const seed=game().currentRound?.seed||1000+level.id;return generateQuestion(level,seed,type);}
function currentQuestion(){const q=baseQuestion();return {...q,target:q.family==='dot'?(session.target||q.target):q.target};}
function shell(content){return `<div class="page">${content}</div>`;}
function notebook(){return `<section class="stack"><h1>Concept notebook</h1><div class="card">${CONCEPTS.map(c=>`<article class="notebook-entry"><h2>${c.title}</h2><div class="math">\\[${c.formula}\\]</div><div class="math">\\[${c.gradient}\\]</div><p>${c.note}</p></article>`).join('')}</div></section>`;}
function levels(){return `<section class="stack"><h1>Choose a relay</h1><div class="level-list">${LEVELS.map(l=>`<button class="level-btn ${l.id===game().progress.currentLevel?'current':''}" data-level="${l.id}"><span>${l.id}. ${l.title}</span><span>${game().progress.completedLevels.includes(l.id)?'✓':''}</span></button>`).join('')}</div></section>`;}
function applySettings(){const s=store.data.learner.settings;document.documentElement.style.fontSize=`${s.fontScale||1}em`;document.documentElement.classList.toggle('reduce-motion',Boolean(s.reducedMotion));}
function render({focus=false}={}){let content='';if(store.view==='welcome')content=welcomeView(game());else if(store.view==='tutorial')content=tutorialView(tutorialStep,tutorialCompletedSteps.has(tutorialStep),tutorialFeedback);else if(store.view==='game')content=relayView(currentLevel(),currentQuestion(),session,feedback);else if(store.view==='progress')content=progressView(game());else if(store.view==='notebook')content=notebook();else content=levels();app.innerHTML=shell(content);applySettings();document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-current',el.dataset.view===store.view?'page':'false'));document.querySelector('[data-action="font-scale"]')?.setAttribute('aria-pressed',String(store.data.learner.settings.fontScale>1));document.querySelector('[data-action="motion"]')?.setAttribute('aria-pressed',String(store.data.learner.settings.reducedMotion));renderMath(app);if(focus)document.getElementById('main-content')?.focus();}
function persistSession(){game().currentRound={id:currentQuestion().id,seed:baseQuestion().seed||1000+currentLevel().id,session:structuredClone(session)};store.notify();}
function repairSession(q,type){
 const base={roundType:type,stages:[...q.stages],shapes:expectedStageShapes(q),intermediates:expectedIntermediates(q).map(row=>[...row]),scalar:String(evaluateFamily(q.family,q)),derivativeShape:`1×${q.x.length}`,localGradient:`[${gradientFor(q).values.join(',')}]`,finalGradient:`[${expectedGradient(q).join(',')}]`,attempts:0,hints:0,target:q.target||'x'};
 if(q.axisChallenge){const output=computeAxisReduction(q.axisChallenge.matrix,q.axisChallenge.axis);base.axisChoice=q.axisChallenge.axis;base.axisShape=q.axisChallenge.axis==='rows'?`${q.axisChallenge.matrix.length}×1`:q.axisChallenge.axis==='columns'?`1×${q.axisChallenge.matrix[0].length}`:'scalar';base.axisOutput=Array.isArray(output)?`[${output.join(',')}]`:String(output);}
 if(q.comparison==='sum-mean'){const sum=q.x.reduce((a,b)=>a+b,0);base.comparisonSum=String(sum);base.comparisonMean=String(sum/q.x.length);base.comparisonSumGradient=`[${Array(q.x.length).fill(1)}]`;base.comparisonMeanGradient=`[${Array(q.x.length).fill(1/q.x.length)}]`;}
 const fault=q.repair?.type;if(fault==='missingReduction')base.stages=base.stages.filter(stage=>!['sum','mean','weightedSum','max'].includes(stage));if(fault==='identitySum')base.localGradient=JSON.stringify(q.x.map((_,i)=>q.x.map((__,j)=>i===j?1:0)));if(fault==='upstreamOmitted')base.finalGradient=base.localGradient;if(fault==='missingMean'){const values=gradientFor(q).values.map(v=>v*q.x.length);base.localGradient=`[${values}]`;base.finalGradient=`[${values.map(v=>v*(q.upstream??1))}]`;}if(fault==='meanTwice'){const values=gradientFor(q).values.map(v=>v/q.x.length);base.localGradient=`[${values}]`;base.finalGradient=`[${values.map(v=>v*(q.upstream??1))}]`;}if(fault==='wrongLane'){const values=expectedGradient(q);[values[0],values[1]]=[values[1],values[0]];base.finalGradient=`[${values}]`;}if(fault==='wrongOrder')base.stages=[...base.stages].reverse();if(fault==='wrongOperand'){const wrong=q.target==='y'?q.y:q.x;base.localGradient=`[${wrong}]`;base.finalGradient=`[${wrong.map(v=>v*(q.upstream??1))}]`;}if(fault==='diagonalFinal')base.finalGradient=JSON.stringify(q.y.map((v,i)=>q.y.map((_,j)=>i===j?v:0)));if(fault==='squareOnes')base.localGradient=`[${Array(q.x.length).fill(1)}]`;if(fault==='oneLaneOnly'){const values=expectedGradient(q).map((v,i)=>i===0?v:0);base.finalGradient=`[${values}]`;}if(fault==='wrongOrientation')base.derivativeShape=`${q.x.length}×1`;if(fault==='sumInsteadMean')base.stages=['sum'];return base;
}
function resetSession(type='guided',seed=1000+currentLevel().id){const q=type==='guided'?(SAMPLE_ROUNDS.find(x=>x.level===currentLevel().id)||generateQuestion(currentLevel(),seed,type)):generateQuestion(currentLevel(),seed,type);session=type==='repair'?repairSession(q,type):{roundType:type,stages:[],shapes:[],intermediates:[],scalar:'',derivativeShape:'',localGradient:'',finalGradient:'',attempts:0,hints:0,target:q.target||'x'};feedback='';game().currentRound={id:q.id,seed,session:structuredClone(session)};store.notify();}
function restoreSession(){const saved=game().currentRound?.session;if(saved&&typeof saved==='object')session={...session,...saved};}
function setArrayField(el){const key=el.dataset.array,index=Number(el.dataset.index);if(key==='intermediates'){const row=Number(el.dataset.row);session.intermediates[row]??=[];session.intermediates[row][index]=el.value;}else{session[key]??=[];session[key][index]=el.value;}}
function submittedCheckpoint(first){
 if(first.part==='pipeline')return session.stages;
 if(first.part==='derivative-shape'||first.part.startsWith('shape'))return first.actual;
 if(first.part.startsWith('local-'))return session.localGradient;
 if(first.part.startsWith('final-'))return session.finalGradient;
 if(first.part==='comparison-sum-gradient')return session.comparisonSumGradient;
 if(first.part==='comparison-mean-gradient')return session.comparisonMeanGradient;
 return first.actual;
}

app.addEventListener('input',e=>{if(e.target.dataset.field){session[e.target.dataset.field]=e.target.value;persistSession();}else if(e.target.dataset.array){setArrayField(e.target);persistSession();}});
app.addEventListener('change',async e=>{if(e.target.id==='import-file'&&e.target.files[0]){try{store.data=await importState(e.target.files[0]);restoreSession();store.view='progress';feedback='';announce('Progress imported');render({focus:true});}catch(err){feedback=feedbackHTML(false,err.message);announce(err.message);render();}}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const {action,view,stage,level,round,tile,stageAction,index,tutorialAnswer}=b.dataset;
 if(tutorialAnswer!==undefined){if(isTutorialAnswerCorrect(tutorialStep,tutorialAnswer)){tutorialCompletedSteps.add(tutorialStep);tutorialFeedback='Correct — carry that result to the next checkpoint.';announce('Tutorial answer correct');}else{tutorialFeedback='Not yet. Recheck the shape or operation described above.';announce('Tutorial answer incorrect');}render();return;}
 if(view){store.view=view;render({focus:true});return;}if(level){game().progress.currentLevel=Number(level);resetSession();store.view='game';render({focus:true});return;}
 if(round){resetSession(round,1000+currentLevel().id+(round==='practice'?100:round==='repair'?200:300));render();return;}
 if(stage){if(stage==='dot')session.stages.push('ewMultiply','sum');else session.stages.push(stage);session.shapes=[];persistSession();render();return;}
 if(stageAction){const i=Number(index);if(stageAction==='remove')session.stages.splice(i,1);else{const j=stageAction==='left'?i-1:i+1;if(j>=0&&j<session.stages.length)[session.stages[i],session.stages[j]]=[session.stages[j],session.stages[i]];}session.shapes=[];persistSession();render();return;}
 if(tile){const field=document.querySelector('[data-field="localGradient"]'),value=session.localGradient?.trim();session.localGradient=value?`${value.replace(/\]$/,'')}, ${tile}]`:`[${tile}]`;persistSession();render();document.querySelector('[data-field="localGradient"]')?.focus();return;}
 if(action==='start'){store.view='game';restoreSession();if(!game().currentRound)resetSession();render({focus:true});}
 if(action==='tutorial'){store.view='tutorial';render({focus:true});}if(action==='home'){store.view='welcome';render({focus:true});}if(action==='levels'){store.view='levels';render({focus:true});}
 if(action==='prev-tutorial'){tutorialStep=Math.max(0,tutorialStep-1);tutorialFeedback='';render({focus:true});}if(action==='next-tutorial'&&tutorialCompletedSteps.has(tutorialStep)){if(tutorialStep<8){tutorialStep++;tutorialFeedback='';}else{game().tutorialComplete=true;store.view='game';resetSession();}render({focus:true});}
 if(action==='hint'){session.hints++;const result=validateRelay(currentQuestion(),session),part=result.first?.part||'explanation';session.hint=part==='pipeline'?'Build the ordered forward computation before doing arithmetic.':part.startsWith('shape')?'Follow whether this station preserves lanes or reduces them.':part.startsWith('lane')?'Recompute only the highlighted component.':part==='scalar'?'Route every component into the accumulator.':'Reverse from the scalar and multiply local factors along each lane.';persistSession();render();}
 if(action==='check'){const q=currentQuestion();session.attempts++;const result=validateRelay(q,session),correctParts=result.checks.filter(c=>c.correct).length;recordComponentScores(game(),result.checks);const total=scoreRound({correct:result.correct,attempts:session.attempts,hints:session.hints,parts:result.checks.length,correctParts}),award=Math.max(0,total-(session.awarded||0));session.awarded=(session.awarded||0)+award;game().progress.score+=award;if(result.correct){session.complete=true;game().progress.streak=(game().progress.streak||0)+1;game().progress.bestStreak=Math.max(game().progress.bestStreak||0,game().progress.streak);game().progress.completedLevels=[...new Set([...game().progress.completedLevels,q.level])];game().mastery=updateMastery(game().mastery,q.family,true,session.hints,session.roundType,session.attempts===1);feedback=feedbackHTML(true,`Every checkpoint is consistent. Scalar ${result.expected.scalar}; final row [${result.expected.finalGradient.join(', ')}]. +${award} points.`);announce('Complete relay correct');}else{session.complete=false;game().progress.streak=0;const key=classifyReductionMisconception(q,submittedCheckpoint(result.first),result.first.part);game().mastery=updateMastery(game().mastery,q.family,false,session.hints,session.roundType,session.attempts===1);game().misconceptions[key]=(game().misconceptions[key]||0)+1;feedback=feedbackHTML(false,`Earliest inconsistent checkpoint: ${result.first.part}. ${MISCONCEPTIONS[key]||MISCONCEPTIONS.localDerivative} ${correctParts}/${result.checks.length} checkpoints retained; +${award} partial-credit points.`);announce(`Repair ${result.first.part}`);}persistSession();render();}
 if(action==='new-practice'){resetSession('practice',Date.now()>>>0);render();}
 if(action==='export'){const url=URL.createObjectURL(exportState(store.data)),a=document.createElement('a');a.href=url;a.download='reduction-relay-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);announce('Progress exported');}
 if(action==='reset'&&confirm('Reset all Reduction Relay progress?')){store.data=resetState();session={...session,stages:[]};store.view='welcome';render({focus:true});}
 if(action==='font-scale'){store.data.learner.settings.fontScale=store.data.learner.settings.fontScale>1?1:1.15;store.notify();render();}
 if(action==='motion'){store.data.learner.settings.reducedMotion=!store.data.learner.settings.reducedMotion;store.notify();render();}
});
restoreSession();render();
