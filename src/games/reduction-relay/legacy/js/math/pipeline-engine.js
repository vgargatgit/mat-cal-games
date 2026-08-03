import {computeReductionOutput} from './reduction-model.js';

const SUPPORTED=new Set(['ewAdd','ewMultiply','square','scale','sum','mean','weightedSum','max','noReduction']);
const vector=v=>Array.isArray(v);
const clone=v=>vector(v)?[...v]:v;

/** Validate an explicit ordered DAG without consulting display labels. */
export function validatePipeline(pipeline,inputs={}){
  const errors=[];
  if(!Array.isArray(pipeline)||pipeline.length===0) return {valid:false,errors:['Pipeline is empty']};
  const available=new Set(Object.keys(inputs)),outputs=new Set();
  for(const stage of pipeline){
    if(!stage||!stage.id||!stage.op||!Array.isArray(stage.inputs)) {errors.push('Malformed stage');continue;}
    if(!SUPPORTED.has(stage.op)) errors.push(`Unsupported operation type: ${stage.op}`);
    if(outputs.has(stage.output)||Object.hasOwn(inputs,stage.output)) errors.push(`Duplicate output identifier: ${stage.output}`);
    for(const id of stage.inputs) if(!available.has(id)) errors.push(`Missing or disconnected input: ${id}`);
    outputs.add(stage.output); available.add(stage.output);
  }
  const graph=new Map(pipeline.map(s=>[s.output,s.inputs.filter(i=>outputs.has(i))]));
  const visiting=new Set(),visited=new Set();
  function visit(id){if(visiting.has(id)){errors.push('Pipeline contains a cycle');return;}if(visited.has(id))return;visiting.add(id);for(const x of graph.get(id)||[])visit(x);visiting.delete(id);visited.add(id);}
  for(const id of graph.keys())visit(id);
  return {valid:errors.length===0,errors:[...new Set(errors)]};
}

function evaluateStage(stage,args){
  const [a,b]=args;
  switch(stage.op){
    case 'ewAdd': case 'ewMultiply':
      if(!vector(a)||!vector(b)||a.length!==b.length) throw new Error(`${stage.op} requires equal-length vectors`);
      return a.map((v,i)=>stage.op==='ewAdd'?v+b[i]:v*b[i]);
    case 'square': if(!vector(a))throw new Error('Square requires a vector');return a.map(v=>v*v);
    case 'scale': if(!vector(a)||!Number.isFinite(stage.params?.scalar))throw new Error('Scale requires a vector and finite scalar');return a.map(v=>v*stage.params.scalar);
    case 'sum': case 'mean': case 'max': return computeReductionOutput(stage.op,a);
    case 'weightedSum': return computeReductionOutput('weightedSum',a,{weights:stage.params?.weights});
    case 'noReduction': return clone(a);
    default: throw new Error(`Unsupported operation type: ${stage.op}`);
  }
}

/** Evaluate all stage values while preserving named intermediates. */
export function computePipelineForward(pipeline,inputs){
  const check=validatePipeline(pipeline,inputs);if(!check.valid)throw new Error(check.errors.join('; '));
  const values=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,clone(v)]));
  for(const stage of pipeline) values[stage.output]=evaluateStage(stage,stage.inputs.map(id=>values[id]));
  return {values,output:values[pipeline.at(-1).output]};
}

export function computeLocalDerivative(stage,target,context){
  const args=stage.inputs.map(id=>context.values[id]),a=args[0],b=args[1];
  switch(stage.op){
    case 'sum': return Array(a.length).fill(1);
    case 'mean': return Array(a.length).fill(1/a.length);
    case 'weightedSum': return [...stage.params.weights];
    case 'max': {const maximum=Math.max(...a);if(a.filter(v=>v===maximum).length!==1)throw new Error('Maximum derivative is not unique at a tie');return a.map(v=>v===maximum?1:0);}
    case 'square': return a.map(v=>2*v);
    case 'scale': return Array(a.length).fill(stage.params.scalar);
    case 'noReduction': return Array(a.length).fill(1);
    case 'ewAdd': return Array(a.length).fill(1);
    case 'ewMultiply': return target===stage.inputs[0]?[...b]:[...a];
    default: throw new Error(`No derivative for ${stage.op}`);
  }
}

/** Reverse-mode scalar-output propagation with accumulation across multiple paths. */
export function propagateGradientBackward(pipeline,outputGradient,targetInput,inputs){
  if(!Number.isFinite(outputGradient))throw new Error('Output gradient must be scalar');
  const forward=computePipelineForward(pipeline,inputs),adjoints={[pipeline.at(-1).output]:outputGradient};
  for(const stage of [...pipeline].reverse()){
    const upstream=adjoints[stage.output];if(upstream===undefined)continue;
    for(const input of stage.inputs){
      const local=computeLocalDerivative(stage,input,forward);
      const contribution=vector(upstream)?upstream.map((g,i)=>g*local[i]):local.map(v=>upstream*v);
      if(adjoints[input]) adjoints[input]=adjoints[input].map((v,i)=>v+contribution[i]); else adjoints[input]=contribution;
    }
  }
  if(!adjoints[targetInput])throw new Error(`Target input ${targetInput} is disconnected`);
  return {gradient:adjoints[targetInput],adjoints,forward};
}

export function linearPipeline(stageIds,question){
  const stages=[];let previous='x';
  stageIds.forEach((op,i)=>{const output=`v${i+1}`,inputs=op==='ewMultiply'?[previous,'y']:[previous];stages.push({id:`stage-${i+1}`,op,inputs,output,params:op==='weightedSum'?{weights:question.w}:undefined});previous=output;});
  return stages;
}
