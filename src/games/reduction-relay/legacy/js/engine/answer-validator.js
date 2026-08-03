import {gradientFor} from '../math/symbolic-derivative.js';
import {evaluateFamily} from '../math/numeric-evaluator.js';
import {expandDotProduct,computeAxisReduction} from '../math/reduction-model.js';

const near=(a,b,tol=1e-8)=>Number.isFinite(a)&&Math.abs(a-b)<=tol;
export function parseVector(text){if(Array.isArray(text))return text.map(Number);const clean=String(text??'').trim().replace(/[\[\]()]/g,'');if(!clean)return [];return clean.split(/[,&\s]+/).filter(Boolean).map(Number);}
function tokenValue(raw,q,index,includeUpstream=false){
 const token=raw.trim().replace(/₁/g,'1').replace(/₂/g,'2').replace(/₃/g,'3').replace(/₄/g,'4').replace(/₅/g,'5').replace(/·/g,'*');
 if(/^[-+]?\d*\.?\d+$/.test(token))return Number(token);
 if(/^[-+]?\d+\/\d+$/.test(token)){const [a,b]=token.split('/').map(Number);return a/b;}
 if(token==='g')return q.upstream??1;
 const factors=token.split('*');if(factors.length>1)return factors.reduce((product,factor)=>product*tokenValue(factor,q,index,includeUpstream),1);
 const match=token.match(/^(2)?([xyw])(\d+)$/);if(match){const multiplier=match[1]?2:1,source=match[2]==='x'?q.x:match[2]==='y'?q.y:q.w;return multiplier*source?.[Number(match[3])-1];}
 if(token==='1/n')return 1/q.x.length;
 if(includeUpstream&&token.startsWith('g'))return (q.upstream??1)*tokenValue(token.slice(1),q,index,false);
 return Number.NaN;
}
export function parseDerivativeVector(text,q,includeUpstream=false){if(Array.isArray(text))return text.map(Number);const clean=String(text??'').trim().replace(/^\[|\]$/g,'');if(!clean)return [];return clean.split(/[,;&]+/).map((token,index)=>tokenValue(token,q,index,includeUpstream));}
export function expectedGradient(q){const base=gradientFor(q).values;return base.map(v=>v*(q.upstream??1));}
export function expectedIntermediates(q){if(q.family==='dot')return [expandDotProduct(q.x,q.y).products];if(['sum-squares','weighted-sum-squares','mse'].includes(q.family))return [q.x.map(v=>v*v)];return [];}
export function expectedStageShapes(q){const n=q.x.length;return q.stages.map(stage=>['sum','mean','weightedSum','max'].includes(stage)?'scalar':`${n}×1`);}

/** Validate every relay checkpoint, returning the earliest inconsistent stage. */
export function validateRelay(q,state){
 const checks=[];const add=(part,correct,code,expected,actual)=>checks.push({part,correct,code,expected,actual});
 if(q.axisChallenge){const expected=computeAxisReduction(q.axisChallenge.matrix,q.axisChallenge.axis),shape=q.axisChallenge.axis==='rows'?`${q.axisChallenge.matrix.length}×1`:q.axisChallenge.axis==='columns'?`1×${q.axisChallenge.matrix[0].length}`:'scalar',got=Array.isArray(expected)?parseVector(state.axisOutput):Number(state.axisOutput);add('axis-choice',state.axisChoice===q.axisChallenge.axis,'batchFeature',q.axisChallenge.axis,state.axisChoice);add('axis-shape',state.axisShape===shape,'shape',shape,state.axisShape);add('axis-output',Array.isArray(expected)?got.length===expected.length&&got.every((v,i)=>near(v,expected[i])):near(got,expected),'arithmetic',expected,got);}
 if(q.comparison==='sum-mean'){const sum=q.x.reduce((a,b)=>a+b,0),mean=sum/q.x.length;add('comparison-sum',near(Number(state.comparisonSum),sum),'sumDivided',sum,state.comparisonSum);add('comparison-mean',near(Number(state.comparisonMean),mean),'missingMean',mean,state.comparisonMean);add('comparison-sum-gradient',parseDerivativeVector(state.comparisonSumGradient,q).every((v,i,a)=>a.length===q.x.length&&near(v,1)),'identityForSum',Array(q.x.length).fill(1),state.comparisonSumGradient);add('comparison-mean-gradient',parseDerivativeVector(state.comparisonMeanGradient,q).every((v,i,a)=>a.length===q.x.length&&near(v,1/q.x.length)),'missingMean',Array(q.x.length).fill(1/q.x.length),state.comparisonMeanGradient);}
 add('pipeline',JSON.stringify(state.stages||[])===JSON.stringify(q.stages),'pipeline',q.stages,state.stages||[]);
 const shapes=state.shapes||[];expectedStageShapes(q).forEach((v,i)=>add(`shape-${i+1}`,shapes[i]===v,shapes[i]?.includes('×')&&v==='scalar'?'reductionLeftVector':'shape',v,shapes[i]));
 expectedIntermediates(q).forEach((row,i)=>{const got=parseVector(state.intermediates?.[i]);row.forEach((v,j)=>add(`lane-${i+1}-${j+1}`,near(got[j],v),'laneArithmetic',v,got[j]));});
 const scalar=evaluateFamily(q.family,q);add('scalar',near(Number(state.scalar),scalar),'scalarValue',scalar,state.scalar);
 add('derivative-shape',state.derivativeShape===`1×${q.x.length}`,'wrongOrientation',`1×${q.x.length}`,state.derivativeShape);
 const local=gradientFor(q).values,gotLocal=parseDerivativeVector(state.localGradient,q);local.forEach((v,i)=>add(`local-${i+1}`,near(gotLocal[i],v),'localGradient',v,gotLocal[i]));
 const final=expectedGradient(q),gotFinal=parseDerivativeVector(state.finalGradient,q,true);final.forEach((v,i)=>add(`final-${i+1}`,near(gotFinal[i],v),'finalGradient',v,gotFinal[i]));
 const first=checks.find(c=>!c.correct);return {correct:!first,first,checks,expected:{scalar,intermediates:expectedIntermediates(q),localGradient:local,finalGradient:final}};
}

export function validateAnswer(q,state){if(state.scalar!==undefined)return validateRelay(q,state);const issues=[];if(state.stages&&JSON.stringify(state.stages)!==JSON.stringify(q.stages))issues.push('pipeline');if(state.shape&&state.shape!==`1×${q.x.length}`)issues.push('shape');const expected=state.mode==='forward'?evaluateFamily(q.family,q):expectedGradient(q),got=state.mode==='forward'?Number(state.value):parseDerivativeVector(state.value,q,true);if(Array.isArray(expected)){if(got.length!==expected.length)issues.push('gradient-length');else if(!got.every((v,i)=>near(v,expected[i])))issues.push('gradient-values');}else if(!near(got,expected))issues.push('value');return {correct:!issues.length,issues,expected};}

export function classifyReductionMisconception(q,answer,part='final'){
 const raw=String(answer??''),got=parseDerivativeVector(answer,q,part==='final'),n=q.x.length,local=gradientFor(q).values,final=expectedGradient(q),g=q.upstream??1;
 if(part==='pipeline'){const stages=Array.isArray(answer)?answer:[];if(q.family==='dot'&&stages.includes('ewMultiply')&&!stages.includes('sum'))return 'dotVsElementwise';if(q.family==='dot'&&stages.join(',')==='sum,ewMultiply')return 'wrongStageOrder';return 'missingReduction';}
 if(part.startsWith('shape')||part==='axis-shape')return 'shape';if(part==='derivative-shape')return 'wrongOrientation';
 if(raw.includes('[[')||got.length===n*n)return q.family==='dot'?'diagonalFinal':'identityForSum';
 if(got.length===1&&final.length>1)return 'scalarGradient';
 if(got.length===n&&got.filter(v=>!near(v,0)).length===1)return 'oneLaneOnly';
 if(q.family==='sum'&&got.every(v=>near(v,1/n)))return 'sumDivided';
 if(q.family==='weighted-sum'&&got.every(v=>near(v,1)))return 'weightedOnes';
 if(['sum-squares','weighted-sum-squares','mse'].includes(q.family)&&got.every(v=>near(v,1)))return 'squareOnes';
 if(['mean','mse'].includes(q.family)&&got.every((v,i)=>near(v,local[i]*n)))return 'missingMean';
 if(['mean','mse'].includes(q.family)&&got.every((v,i)=>near(v,local[i]/n)))return 'meanTwice';
 if(q.family==='dot'&&got.length===n){const wrong=q.target==='y'?q.y:q.x;if(got.every((v,i)=>near(v,wrong[i]*(part==='final'?g:1))))return 'wrongOperand';}
 if(g!==1&&part==='final'&&got.every((v,i)=>near(v,local[i])))return 'upstreamOmitted';
 if(g!==1&&part==='final'&&got.every((v,i)=>near(v,local[i]+g)))return 'upstreamAdded';
 if(got.length===n&&[...got].sort((a,b)=>a-b).every((v,i)=>near(v,[...final].sort((a,b)=>a-b)[i])))return 'wrongLane';
 if(part==='axis-choice')return 'batchFeature';return part.startsWith('lane')||part.includes('scalar')||part==='axis-output'?'arithmetic':'localDerivative';
}
export function classify(issues,q,submitted){return classifyReductionMisconception(q,submitted,issues[0]==='pipeline'?'pipeline':issues[0]==='shape'?'derivative-shape':'final');}
