import { variable as v, ref, constant as c, sum, product, power, func, evaluateExpression } from '../js/math/expression-model.js';
import { buildComputationGraph, detectCycle } from '../js/math/computation-graph.js';
import { findAllDependencyPaths, buildDependencyMatrix } from '../js/math/dependency-analysis.js';
import { classifyStructuralPattern, isIdentityJacobian } from '../js/math/jacobian-classifier.js';
import { classifyZeroReason } from '../js/math/structural-jacobian.js';
import { differentiateExpression, derivativeToLatex, evaluateDerivative, finiteDifference } from '../js/math/symbolic-derivative.js';
import { CASES } from '../js/data/cases.js';
import { generateCase, validateGeneratedCase } from '../js/engine/question-generator.js';
import { validateAnswer } from '../js/engine/answer-validator.js';
import { validateImportedState } from '../js/storage.js';
import { defaultState } from '../js/state.js';

function assert(condition, message='Assertion failed') { if (!condition) throw new Error(message); }
function equal(actual, expected, message='Values differ') { if (JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`${message}\nexpected ${JSON.stringify(expected)}\nactual   ${JSON.stringify(actual)}`); }
function approx(actual, expected, tolerance=1e-5, message='Values not approximately equal') { if (Math.abs(actual-expected)>tolerance) throw new Error(`${message}: expected ${expected}, got ${actual}`); }

const tests=[];
const test=(name,fn)=>tests.push({name,fn});

test('direct dependencies create expected paths',()=>{
  const definition={inputs:[{name:'x_1'},{name:'x_2'}],intermediates:[],outputs:[{name:'y_1',expressionAst:sum(power(v('x_1'),2),v('x_2'))}]};
  const graph=buildComputationGraph(definition);
  equal(findAllDependencyPaths('y_1','x_1',graph),[['x_1','y_1']]);
  equal(findAllDependencyPaths('y_1','x_2',graph),[['x_2','y_1']]);
});

test('missing dependency creates structural zero',()=>{
  const definition={inputs:[{name:'x_1'},{name:'x_2'}],intermediates:[],outputs:[{name:'y_1',expressionAst:v('x_1')}]};
  const graph=buildComputationGraph(definition);
  equal(buildDependencyMatrix(definition.outputs,definition.inputs,graph),[[true,false]]);
});

test('indirect dependencies are detected through named intermediates',()=>{
  const definition={inputs:[{name:'x_1'},{name:'x_2'}],intermediates:[{name:'u',expressionAst:sum(v('x_1'),v('x_2'))}],outputs:[{name:'y_1',expressionAst:power(ref('u'),2)}]};
  const graph=buildComputationGraph(definition);
  equal(findAllDependencyPaths('y_1','x_1',graph),[['x_1','u','y_1']]);
  equal(buildDependencyMatrix(definition.outputs,definition.inputs,graph),[[true,true]]);
});

test('multiple paths into one cell are all found',()=>{
  const definition={inputs:[{name:'x_1'},{name:'x_2'}],intermediates:[{name:'u',expressionAst:product(v('x_1'),v('x_2'))}],outputs:[{name:'y_1',expressionAst:sum(ref('u'),v('x_1'))}]};
  const graph=buildComputationGraph(definition);
  const paths=findAllDependencyPaths('y_1','x_1',graph);
  assert(paths.some(path=>path.join('/')==='x_1/y_1'));
  assert(paths.some(path=>path.join('/')==='x_1/u/y_1'));
});

test('cycle detection rejects cyclic computation graphs',()=>{
  const graph={nodes:[{id:'u'},{id:'v'}],edges:[{source:'u',target:'v'},{source:'v',target:'u'}]};
  assert(Boolean(detectCycle(graph)));
});

test('diagonal and identity classifications are distinct',()=>{
  const structural=[[true,false],[false,true]];
  const diagonal=classifyStructuralPattern(structural,[['2x_1','0'],['0','3']]);
  assert(diagonal.diagonal); assert(!diagonal.identity);
  assert(isIdentityJacobian(structural,[['1','0'],['0','1']]));
});

test('square dense mapping is not diagonal',()=>{
  const result=classifyStructuralPattern([[true,true],[true,true]],[['1','1'],['1','-1']]);
  assert(result.square&&result.dense&&!result.diagonal&&!result.identity);
});

test('permutation mapping is sparse and not diagonal',()=>{
  const result=classifyStructuralPattern([[false,true],[true,false]],[['0','1'],['1','0']]);
  assert(result.square&&result.sparse&&result.permutationLike&&!result.diagonal);
});

test('zero rows and zero columns are detected',()=>{
  const result=classifyStructuralPattern([[false,false,false],[true,true,false]],[['0','0','0'],['1','1','0']]);
  equal(result.zeroRows,[0]); equal(result.zeroColumns,[2]);
});

test('block diagonal and triangular patterns classify correctly',()=>{
  const block=classifyStructuralPattern([[true,true,false,false],[true,true,false,false],[false,false,true,false],[false,false,false,true]]);
  assert(block.blockDiagonal);
  const upper=classifyStructuralPattern([[true,true,true],[false,true,true],[false,false,true]]);
  assert(upper.upperTriangular&&!upper.lowerTriangular&&!upper.diagonal);
});

test('structural and evaluated zeros retain different reasons',()=>{
  equal(classifyZeroReason({structurallyDepends:false,evaluatedValue:0}),'no-dependency');
  equal(classifyZeroReason({structurallyDepends:true,evaluatedValue:0}),'local-slope-zero');
  equal(classifyZeroReason({structurallyDepends:true,evaluatedValue:0,activationState:'inactive-relu'}),'inactive-activation');
});

test('symbolic derivative matches finite differences',()=>{
  const expression=sum(power(v('x_1'),2),product(c(3),v('x_2')));
  const derivative=differentiateExpression(expression,'x_1');
  equal(derivativeToLatex(derivative),'2\\,x_{1}');
  const symbolic=evaluateDerivative(expression,'x_1',{x_1:2,x_2:4});
  const numeric=finiteDifference(expression,'x_1',{x_1:2,x_2:4});
  approx(symbolic,4); approx(numeric,4,1e-4);
});

test('ReLU derivative is state dependent but structurally present',()=>{
  const expression=func('relu',v('z_1'));
  equal(evaluateDerivative(expression,'z_1',{z_1:2}),1);
  equal(evaluateDerivative(expression,'z_1',{z_1:-2}),0);
  equal(evaluateDerivative(expression,'z_1',{z_1:0}),0);
});

test('all deterministic cases rebuild their dependency matrices',()=>{
  for(const item of CASES){
    const rebuilt=buildDependencyMatrix(item.outputs,item.inputs,item.graph);
    equal(rebuilt,item.dependencyMatrix,`Dependency mismatch in ${item.id}`);
    assert(!detectCycle(item.graph),`Cycle in ${item.id}`);
  }
});


test('all deterministic symbolic derivatives agree with finite differences away from boundaries',()=>{
  for(const item of CASES){
    const context={intermediates:Object.fromEntries(item.intermediates.map(node=>[node.name,node.expressionAst]))};
    const values=Object.fromEntries(item.inputs.map((input,index)=>[input.name,1.25+index*.7]));
    if(item.evaluationPoint)Object.assign(values,item.evaluationPoint);
    for(const [name,value] of Object.entries(values))if(value===0&&item.outputs.some(output=>JSON.stringify(output.expressionAst).includes('relu')))values[name]=1.5;
    item.outputs.forEach((output,row)=>item.inputs.forEach((input,column)=>{
      const symbolic=evaluateDerivative(output.expressionAst,input.name,values,context);
      const numeric=finiteDifference(output.expressionAst,input.name,values,context);
      approx(symbolic,numeric,2e-4,`Finite-difference mismatch in ${item.id} cell ${row},${column}`);
      if(!item.dependencyMatrix[row][column])approx(symbolic,0,1e-10,`Absent path not zero in ${item.id} cell ${row},${column}`);
    }));
  }
});


test('required deterministic sample cases are present',()=>{
  const required=['sample-identity','sample-diagonal-not-identity','sample-square-dense','sample-sparse-cross','sample-permuted','sample-constant-output','sample-unused-input','sample-indirect','sample-multiple-paths','sample-evaluated-zero','sample-elementwise-nonlinear','sample-relu','feature-mixing','sample-block'];
  const ids=new Set(CASES.map(item=>item.id));
  required.forEach(id=>assert(ids.has(id),`Missing required case ${id}`));
});

test('answer validator accepts a fully correct deterministic answer',()=>{
  const item=CASES.find(candidate=>candidate.id==='sample-evaluated-zero');
  const dependencies=[];item.dependencyMatrix.forEach((row,r)=>row.forEach((depends,c)=>{if(depends)dependencies.push(`${r}-${c}`);}));
  const grid={};for(let r=0;r<item.expectedShape.rows;r+=1)for(let c=0;c<item.expectedShape.columns;c+=1){const key=`${r}-${c}`;grid[key]=item.dependencyMatrix[r][c]?(item.zeroReasons[key]==='local-slope-zero'?'evaluated-zero':'possible'):'structural-zero';}
  const classifications=item.classificationOptions.filter(key=>Boolean(item.classification[key]));
  const derivatives={};item.derivativeTargets.forEach(target=>derivatives[`${target.row}-${target.column}`]=target.expected[0]);
  const result=validateAnswer(item,{shape:item.expectedShape,dependencies,grid,classifications,derivatives,zeroReasons:item.zeroReasons});
  assert(result.allCorrect,JSON.stringify(result));
});

test('state import validation accepts defaults and rejects malformed state',()=>{
  assert(validateImportedState(defaultState()).valid);
  assert(!validateImportedState({schemaVersion:99}).valid);
});

test('2,000 generated cases satisfy structural invariants',()=>{
  for(let seed=1;seed<=2000;seed+=1){const item=generateCase(seed);const validation=validateGeneratedCase(item);assert(validation.valid,`Seed ${seed}: ${validation.errors.join(', ')}`);}
});

export async function runAllTests() {
  const results=[];
  for(const item of tests){const started=performance.now();try{await item.fn();results.push({name:item.name,passed:true,durationMs:performance.now()-started});}catch(error){results.push({name:item.name,passed:false,error:error.stack||error.message,durationMs:performance.now()-started});}}
  return results;
}
