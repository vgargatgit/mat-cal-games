import { SeededRandom } from './seeded-random.js';
import { variable as v, ref, constant as c, sum, product, power } from '../math/expression-model.js';
import { buildComputationGraph, detectCycle } from '../math/computation-graph.js';
import { buildDependencyMatrix, buildDependencyCells } from '../math/dependency-analysis.js';
import { buildStructuralJacobian } from '../math/structural-jacobian.js';
import { classifyStructuralPattern } from '../math/jacobian-classifier.js';

const input = name => ({ name, type:'scalar' });
const output = (name, expressionLatex, expressionAst) => ({ name, expressionLatex, expressionAst });
const intermediate = (name, expressionLatex, expressionAst) => ({ name, expressionLatex, expressionAst });

function coefficient(rng) {
  let value = 0;
  while (value === 0) value = rng.int(-5,5);
  return value;
}

function termLatex(coeff, name, exponent = 1) {
  const abs = Math.abs(coeff);
  const coefficientText = abs === 1 ? '' : String(abs);
  const variableText = exponent === 1 ? name : `${name}^${exponent}`;
  return `${coeff < 0 ? '-' : ''}${coefficientText}${variableText}`;
}

function joinTerms(terms) {
  return terms.join(' + ').replace(/\+ -/g,'- ');
}

function finalize(definition) {
  const graph = buildComputationGraph(definition);
  const dependencyMatrix = buildDependencyMatrix(definition.outputs, definition.inputs, graph);
  const dependencyCells = buildDependencyCells(definition.outputs, definition.inputs, graph);
  const structuralJacobian = buildStructuralJacobian(dependencyMatrix);
  const classification = classifyStructuralPattern(dependencyMatrix, definition.expectedJacobian);
  return {
    mode:'generated', difficulty:'medium', hints:[
      'Inspect one output formula at a time.',
      'Follow direct and intermediate paths before touching the Jacobian grid.',
      'Translate each path into an output-row, input-column cell.'
    ], concepts:['generated-investigation'], classificationOptions:['square','diagonal','identity','sparse','dense','blockDiagonal','permutationLike'],
    derivativeTargets:[], evaluationPoint:null, zeroReasons:{}, explanation:'This case was generated from a seeded expression graph.', neuralConnection:'Structural reachability determines which gradient routes can exist.',
    ...definition, graph, dependencyMatrix, dependencyCells, structuralJacobian,
    expectedShape:{rows:definition.outputs.length,columns:definition.inputs.length}, classification
  };
}

function independentCase(rng, seed, n) {
  const inputs = Array.from({length:n},(_,i)=>input(`x_${i+1}`));
  const outputs = [];
  const jacobian = Array.from({length:n},()=>Array(n).fill('0'));
  for (let i=0;i<n;i+=1) {
    const exponent = rng.int(1,3); const coeff = coefficient(rng);
    const ast = product(c(coeff), power(v(inputs[i].name), exponent));
    outputs.push(output(`y_${i+1}`,termLatex(coeff,inputs[i].name,exponent),ast));
    const derivativeCoeff = coeff*exponent;
    jacobian[i][i] = exponent === 1 ? String(coeff) : termLatex(derivativeCoeff,inputs[i].name,exponent-1);
  }
  return finalize({id:`generated-independent-${seed}`,seed,level:Math.min(17,3+rng.int(0,2)),title:'Generated One-to-One Case',inputs,intermediates:[],outputs,expectedJacobian:jacobian,
    derivativeTargets:[{row:0,column:0,expected:[jacobian[0][0]]}]});
}

function polynomialCase(rng, seed, n, dense = false) {
  const inputs = Array.from({length:n},(_,i)=>input(`x_${i+1}`));
  const outputs=[]; const jacobian=[];
  for (let i=0;i<n;i+=1) {
    const terms=[]; const expressions=[]; const row=[];
    let dependencies=0;
    for (let j=0;j<n;j+=1) {
      const include = dense || rng.bool(.45) || (j===i && dependencies===0);
      if (!include) { row.push('0'); continue; }
      dependencies += 1;
      const coeff=coefficient(rng); const exponent=rng.int(1,3);
      terms.push(termLatex(coeff,inputs[j].name,exponent));
      expressions.push(product(c(coeff),power(v(inputs[j].name),exponent)));
      row.push(exponent===1?String(coeff):termLatex(coeff*exponent,inputs[j].name,exponent-1));
    }
    outputs.push(output(`y_${i+1}`,joinTerms(terms),sum(expressions)));
    jacobian.push(row);
  }
  const item=finalize({id:`generated-${dense?'dense':'sparse'}-${seed}`,seed,level:dense?8:7,title:dense?'Generated Dense Web':'Generated Sparse Web',inputs,intermediates:[],outputs,expectedJacobian:jacobian});
  const target=[];
  for(let i=0;i<n && target.length<2;i+=1) for(let j=0;j<n && target.length<2;j+=1) if(jacobian[i][j]!=='0') target.push({row:i,column:j,expected:[jacobian[i][j]]});
  item.derivativeTargets=target;
  return item;
}

function triangularCase(rng, seed, n) {
  const inputs=Array.from({length:n},(_,i)=>input(`x_${i+1}`)); const outputs=[]; const jacobian=[];
  for(let i=0;i<n;i+=1){const terms=[];const expressions=[];const row=[];for(let j=0;j<n;j+=1){if(j<i){row.push('0');continue;}const coeff=coefficient(rng);terms.push(termLatex(coeff,inputs[j].name));expressions.push(product(c(coeff),v(inputs[j].name)));row.push(String(coeff));}outputs.push(output(`y_${i+1}`,joinTerms(terms),sum(expressions)));jacobian.push(row);}
  return finalize({id:`generated-triangular-${seed}`,seed,level:15,title:'Generated Ordered Evidence',inputs,intermediates:[],outputs,expectedJacobian:jacobian,classificationOptions:['square','diagonal','identity','sparse','dense','upperTriangular','lowerTriangular'],derivativeTargets:[{row:n-1,column:0,expected:['0']},{row:0,column:n-1,expected:[jacobian[0][n-1]]}]});
}

function indirectCase(rng, seed) {
  const inputs=[input('x_1'),input('x_2'),input('x_3')];
  const a=coefficient(rng),b=coefficient(rng);
  const intermediates=[intermediate('u',joinTerms([termLatex(a,'x_1'),termLatex(b,'x_2')]),sum(product(c(a),v('x_1')),product(c(b),v('x_2'))))];
  const outputs=[output('y_1','u^2',power(ref('u'),2)),output('y_2','u+x_3',sum(ref('u'),v('x_3'))),output('y_3','x_3^2',power(v('x_3'),2))];
  const jacobian=[[`${2*a}u`,`${2*b}u`,'0'],[String(a),String(b),'1'],['0','0','2x_3']];
  return finalize({id:`generated-indirect-${seed}`,seed,level:9,title:'Generated Hidden Trail',inputs,intermediates,outputs,expectedJacobian:jacobian,derivativeTargets:[{row:1,column:0,expected:[String(a)]},{row:1,column:2,expected:['1']}]});
}

function evaluatedZeroCase(rng, seed) {
  const item=independentCase(rng,seed,2);
  item.id=`generated-evaluated-zero-${seed}`; item.level=11; item.title='Generated Local Flat Spot';
  item.inputs=[input('x_1'),input('x_2')];
  item.outputs=[output('y_1','x_1^2',power(v('x_1'),2)),output('y_2','x_2',v('x_2'))];
  item.intermediates=[]; item.expectedJacobian=[['2x_1','0'],['0','1']];
  item.graph=buildComputationGraph(item); item.dependencyMatrix=buildDependencyMatrix(item.outputs,item.inputs,item.graph); item.dependencyCells=buildDependencyCells(item.outputs,item.inputs,item.graph); item.structuralJacobian=buildStructuralJacobian(item.dependencyMatrix); item.classification=classifyStructuralPattern(item.dependencyMatrix,item.expectedJacobian);
  item.expectedShape={rows:2,columns:2}; item.evaluationPoint={x_1:0,x_2:rng.int(1,5)}; item.evaluatedJacobian=[[0,0],[0,1]]; item.zeroReasons={'0-0':'local-slope-zero','0-1':'no-dependency','1-0':'no-dependency'}; item.derivativeTargets=[{row:0,column:0,expected:['2x_1']}];
  return item;
}

export function generateCase(seed = Date.now(), options = {}) {
  const rng=new SeededRandom(seed); const n=Math.max(2,Math.min(4,options.size??rng.int(2,4)));
  const families=options.family?[options.family]:['independent','sparse','dense','triangular','indirect','evaluated-zero'];
  const family=rng.pick(families);
  switch(family){
    case'independent':return independentCase(rng,seed,n);
    case'dense':return polynomialCase(rng,seed,n,true);
    case'triangular':return triangularCase(rng,seed,n);
    case'indirect':return indirectCase(rng,seed);
    case'evaluated-zero':return evaluatedZeroCase(rng,seed);
    case'sparse':default:return polynomialCase(rng,seed,n,false);
  }
}

export function validateGeneratedCase(item) {
  const errors=[];
  if(item.inputs.length<2||item.inputs.length>4)errors.push('input-count');
  if(item.outputs.length<2||item.outputs.length>4)errors.push('output-count');
  if(item.intermediates.length>2)errors.push('intermediate-count');
  if(detectCycle(item.graph))errors.push('cycle');
  const rebuilt=buildDependencyMatrix(item.outputs,item.inputs,item.graph);
  if(JSON.stringify(rebuilt)!==JSON.stringify(item.dependencyMatrix))errors.push('dependency-mismatch');
  const reclassified=classifyStructuralPattern(rebuilt,item.expectedJacobian);
  for(const key of ['square','diagonal','identity','sparse','dense','upperTriangular','lowerTriangular','blockDiagonal','permutationLike']) if(reclassified[key]!==item.classification[key])errors.push(`classification-${key}`);
  if(item.classification.identity&&!item.classification.diagonal)errors.push('identity-not-diagonal');
  if(item.evaluationPoint){for(const [key,reason] of Object.entries(item.zeroReasons)){const [r,c]=key.split('-').map(Number);if(reason==='local-slope-zero'&&!item.dependencyMatrix[r][c])errors.push('local-zero-without-path');}}
  return {valid:errors.length===0,errors};
}
