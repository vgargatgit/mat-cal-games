import { variable as v, ref, constant as c, sum, product, power, func, negate } from '../math/expression-model.js';
import { buildComputationGraph } from '../math/computation-graph.js';
import { buildDependencyMatrix, buildDependencyCells } from '../math/dependency-analysis.js';
import { buildStructuralJacobian } from '../math/structural-jacobian.js';
import { classifyStructuralPattern } from '../math/jacobian-classifier.js';

const input = name => ({ name, type: 'scalar' });
const output = (name, expressionLatex, expressionAst) => ({ name, expressionLatex, expressionAst });
const intermediate = (name, expressionLatex, expressionAst) => ({ name, expressionLatex, expressionAst });

function makeCase(definition) {
  const graph = buildComputationGraph(definition);
  const dependencyMatrix = buildDependencyMatrix(definition.outputs, definition.inputs, graph);
  const dependencyCells = buildDependencyCells(definition.outputs, definition.inputs, graph);
  const structuralJacobian = buildStructuralJacobian(dependencyMatrix);
  const classification = classifyStructuralPattern(dependencyMatrix, definition.expectedJacobian);
  return {
    difficulty: 'medium',
    seed: 10000 + definition.id.length * 317,
    hints: [],
    concepts: [],
    classificationOptions: ['square','diagonal','identity','sparse','dense'],
    derivativeTargets: [],
    evaluationPoint: null,
    zeroReasons: {},
    ...definition,
    graph,
    dependencyMatrix,
    dependencyCells,
    structuralJacobian,
    expectedShape: { rows: definition.outputs.length, columns: definition.inputs.length },
    classification
  };
}

export const CASES = [
  makeCase({
    id:'find-evidence', level:1, title:'Find the Evidence', mode:'guided', difficulty:'easy',
    inputs:[input('x_1'),input('x_2'),input('x_3')], intermediates:[],
    outputs:[output('y_1','x_1^2+3x_3',sum(power(v('x_1'),2),product(c(3),v('x_3'))))],
    expectedJacobian:[['2x_1','0','3']],
    classificationOptions:['sparse','dense','zeroColumn'],
    derivativeTargets:[{row:0,column:0,expected:['2x_1','2*x_1']},{row:0,column:2,expected:['3']}],
    concepts:['direct-dependency','structural-zero','zero-column'],
    hints:['Inspect the symbols that feed y₁.','x₂ is declared, but does it appear in any path to y₁?','The missing x₂ → y₁ path forces column 2 to zero.'],
    explanation:'Only x₁ and x₃ influence y₁. Declaring x₂ does not create a dependency.',
    neuralConnection:'A feature that reaches no output receives no gradient through this operation.'
  }),
  makeCase({
    id:'no-path-zero', level:2, title:'No Path Means Zero', mode:'guided', difficulty:'easy',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_1^2',power(v('x_1'),2)),output('y_2','x_2+1',sum(v('x_2'),c(1)))],
    expectedJacobian:[['2x_1','0'],['0','1']],
    derivativeTargets:[{row:0,column:1,expected:['0']},{row:1,column:0,expected:['0']}],
    concepts:['structural-zero','diagonal-jacobian'],
    hints:['Inspect one output row at a time.','Does x₂ have any route to y₁?','Absent routes become structural zeros.'],
    explanation:'Each output has one matching input dependency. Both off-diagonal cells are structurally zero.',
    neuralConnection:'Independent coordinates propagate without cross-coordinate influence.'
  }),
  makeCase({
    id:'sample-identity', level:3, title:'Identity Mapping', mode:'sample', difficulty:'easy',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_1',v('x_1')),output('y_2','x_2',v('x_2'))],
    expectedJacobian:[['1','0'],['0','1']],
    derivativeTargets:[{row:0,column:0,expected:['1']},{row:1,column:1,expected:['1']}],
    concepts:['identity-jacobian','diagonal-jacobian'],
    hints:['Each output copies one matching input.','The off-diagonal paths are absent.','Check the actual diagonal slopes, not only the dependency pattern.'],
    explanation:'The mapping is square and diagonal, and every diagonal derivative is one, so the Jacobian is identity.',
    neuralConnection:'An identity route passes every coordinate and gradient unchanged.'
  }),
  makeCase({
    id:'sample-diagonal-not-identity', level:4, title:'Diagonal, Not Identity', mode:'sample', difficulty:'easy',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_1^2',power(v('x_1'),2)),output('y_2','3x_2',product(c(3),v('x_2')))],
    expectedJacobian:[['2x_1','0'],['0','3']],
    derivativeTargets:[{row:0,column:0,expected:['2x_1','2*x_1']},{row:1,column:1,expected:['3']}],
    concepts:['diagonal-jacobian','identity-jacobian'],
    hints:['Dependency structure answers where zeros go.','Identity additionally requires unit diagonal slopes.','Compare 2x₁ and 3 with 1.'],
    explanation:'One-to-one dependencies make the Jacobian diagonal, but the diagonal values are not all one.',
    neuralConnection:'Element-wise nonlinearities are diagonal without being identity transformations.'
  }),
  makeCase({
    id:'sample-square-dense', level:5, title:'Square Is Not Diagonal', mode:'sample', difficulty:'easy',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_1+x_2',sum(v('x_1'),v('x_2'))),output('y_2','x_1-x_2',sum(v('x_1'),negate(v('x_2'))))],
    expectedJacobian:[['1','1'],['1','-1']],
    derivativeTargets:[{row:0,column:1,expected:['1']},{row:1,column:0,expected:['1']}],
    concepts:['square-not-diagonal','dense-jacobian','cross-component-dependency'],
    hints:['Equal input and output counts only establish square shape.','Both outputs use both inputs.','Every cell has a dependency path.'],
    explanation:'The 2×2 Jacobian is square and fully dense. Cross-input dependencies create off-diagonal entries.',
    neuralConnection:'A feature-mixing layer couples gradient coordinates.'
  }),
  makeCase({
    id:'cross-component', level:6, title:'Cross-Component Influence', mode:'guided', difficulty:'medium',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_1^2+x_2',sum(power(v('x_1'),2),v('x_2'))),output('y_2','x_2^3',power(v('x_2'),3))],
    expectedJacobian:[['2x_1','1'],['0','3x_2^2']],
    classificationOptions:['square','diagonal','identity','sparse','dense','upperTriangular'],
    derivativeTargets:[{row:0,column:1,expected:['1']},{row:1,column:0,expected:['0']}],
    concepts:['cross-component-dependency','structural-zero','upper-triangular-structure'],
    hints:['Inspect y₁ and y₂ separately.','Does x₁ appear in or feed into y₂?','The missing x₁ → y₂ path forces the lower-left cell to zero.'],
    explanation:'The x₂ → y₁ path creates J₁₂. No x₁ → y₂ path exists, so J₂₁ is structurally zero.',
    neuralConnection:'A single cross-coordinate route is enough to make backpropagation couple coordinates.'
  }),
  makeCase({
    id:'sample-sparse-cross', level:7, title:'Sparse Detective', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2'),input('x_3')], intermediates:[],
    outputs:[output('y_1','x_1+x_3',sum(v('x_1'),v('x_3'))),output('y_2','x_2',v('x_2')),output('y_3','x_1x_3',product(v('x_1'),v('x_3')))],
    expectedJacobian:[['1','0','1'],['0','1','0'],['x_3','0','x_1']],
    derivativeTargets:[{row:2,column:0,expected:['x_3','x3']},{row:2,column:2,expected:['x_1','x1']}],
    concepts:['sparse-jacobian','cross-component-dependency'],
    hints:['Count missing paths, not just matching indices.','Rows 1 and 3 both connect to x₁ and x₃.','Many zeros can coexist with off-diagonal evidence.'],
    explanation:'The matrix has many structural zeros but also cross-component links, so it is sparse and not diagonal.',
    neuralConnection:'Sparse dependency structure limits which gradient coordinates can interact.'
  }),
  makeCase({
    id:'dense-web', level:8, title:'Dense Dependency Web', mode:'guided', difficulty:'medium',
    inputs:[input('x_1'),input('x_2'),input('x_3')], intermediates:[],
    outputs:[
      output('y_1','x_1+x_2+x_3',sum(v('x_1'),v('x_2'),v('x_3'))),
      output('y_2','x_1x_2+x_3',sum(product(v('x_1'),v('x_2')),v('x_3'))),
      output('y_3','x_1^2+x_2^2+x_3^2',sum(power(v('x_1'),2),power(v('x_2'),2),power(v('x_3'),2)))
    ],
    expectedJacobian:[['1','1','1'],['x_2','x_1','1'],['2x_1','2x_2','2x_3']],
    derivativeTargets:[{row:1,column:0,expected:['x_2','x2']},{row:2,column:2,expected:['2x_3','2*x_3']}],
    concepts:['dense-jacobian'],
    hints:['Check every output against every input.','A dense pattern does not require equal derivative values.','All nine paths exist.'],
    explanation:'Every output depends on every input, so the structural Jacobian is fully dense.',
    neuralConnection:'Dense mixing lets every output-gradient coordinate contribute to every input-gradient coordinate.'
  }),
  makeCase({
    id:'sample-indirect', level:9, title:'Indirect Dependency', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2')],
    intermediates:[intermediate('u','x_1+x_2',sum(v('x_1'),v('x_2')))],
    outputs:[output('y_1','u^2',power(ref('u'),2)),output('y_2','x_2',v('x_2'))],
    expectedJacobian:[['2(x_1+x_2)','2(x_1+x_2)'],['0','1']],
    classificationOptions:['square','diagonal','identity','sparse','dense','upperTriangular'],
    derivativeTargets:[{row:0,column:0,expected:['2(x_1+x_2)','2*(x_1+x_2)','2x_1+2x_2']},{row:0,column:1,expected:['2(x_1+x_2)','2*(x_1+x_2)','2x_1+2x_2']}],
    concepts:['indirect-dependency','structural-zero'],
    hints:['Do not stop at the symbol u.','Expand u’s incoming evidence trails.','Both x₁ and x₂ reach y₁ through u.'],
    explanation:'Dependency follows the computation graph. Although y₁ visibly uses u, u carries both x₁ and x₂.',
    neuralConnection:'Backpropagation follows hidden intermediate routes, not only variables visible in the final formula.'
  }),
  makeCase({
    id:'sample-multiple-paths', level:10, title:'Multiple Paths, One Cell', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2')],
    intermediates:[intermediate('u','x_1x_2',product(v('x_1'),v('x_2')))],
    outputs:[output('y_1','u+x_1',sum(ref('u'),v('x_1')))],
    expectedJacobian:[['x_2+1','x_1']],
    classificationOptions:['sparse','dense'],
    derivativeTargets:[{row:0,column:0,expected:['x_2+1','1+x_2','x2+1']}],
    concepts:['multiple-dependency-paths'],
    hints:['Trace x₁ directly and through u.','One Jacobian cell may collect several path contributions.','Differentiate u+x₁ after substituting u=x₁x₂.'],
    explanation:'x₁ reaches y₁ directly and through u. The dependency map marks one cell, while the derivative combines both contributions as x₂+1.',
    neuralConnection:'Chain-rule contributions from multiple routes add at a shared gradient destination.'
  }),
  makeCase({
    id:'sample-evaluated-zero', level:11, title:'Structural Zero vs Evaluated Zero', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_1^2',power(v('x_1'),2)),output('y_2','x_2',v('x_2'))],
    expectedJacobian:[['2x_1','0'],['0','1']],
    evaluatedJacobian:[[0,0],[0,1]],
    evaluationPoint:{x_1:0,x_2:4},
    zeroReasons:{'0-0':'local-slope-zero','0-1':'no-dependency','1-0':'no-dependency'},
    derivativeTargets:[{row:0,column:0,expected:['2x_1','2*x_1']}],
    concepts:['evaluated-zero','structural-zero'],
    hints:['First ask whether a path exists.','Then ask what the derivative equals at the selected point.','J₁₁ keeps its wire even when 2x₁ evaluates to zero.'],
    explanation:'J₁₁ is locally zero at x₁=0 but structurally present. J₁₂ and J₂₁ are zero because no paths exist.',
    neuralConnection:'A gradient route can exist while carrying zero signal at one local state.'
  }),
  makeCase({
    id:'sample-relu', level:12, title:'ReLU Evidence Board', mode:'sample', difficulty:'medium',
    inputs:[input('z_1'),input('z_2'),input('z_3')], intermediates:[],
    outputs:[output('a_1','\\operatorname{ReLU}(z_1)',func('relu',v('z_1'))),output('a_2','\\operatorname{ReLU}(z_2)',func('relu',v('z_2'))),output('a_3','\\operatorname{ReLU}(z_3)',func('relu',v('z_3')))],
    expectedJacobian:[["ReLU'(z_1)",'0','0'],['0',"ReLU'(z_2)",'0'],['0','0',"ReLU'(z_3)"]],
    evaluatedJacobian:[[1,0,0],[0,0,0],[0,0,1]],
    evaluationPoint:{z_1:2,z_2:-1,z_3:3},
    zeroReasons:{'0-1':'no-dependency','0-2':'no-dependency','1-0':'no-dependency','1-1':'inactive-activation','1-2':'no-dependency','2-0':'no-dependency','2-1':'no-dependency'},
    derivativeTargets:[{row:1,column:1,expected:["ReLU'(z_2)","relu'(z_2)"]}],
    concepts:['relu-jacobian','evaluated-zero','diagonal-jacobian'],
    hints:['ReLU is applied coordinate by coordinate.','Inactive does not mean disconnected.','Keep z₂ → a₂ while marking its local gate closed.'],
    explanation:'The ReLU Jacobian is structurally diagonal. At z₂<0 the matching diagonal derivative evaluates to zero, but its dependency wire remains.',
    neuralConnection:'Element-wise gates scale coordinates independently; inactive gates locally block a gradient without deleting the graph edge.'
  }),
  makeCase({
    id:'feature-mixing', level:13, title:'Feature Mixing vs Element-Wise', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('z_1','2x_1+3x_2',sum(product(c(2),v('x_1')),product(c(3),v('x_2')))),output('z_2','-x_1+4x_2',sum(negate(v('x_1')),product(c(4),v('x_2'))))],
    expectedJacobian:[['2','3'],['-1','4']],
    derivativeTargets:[{row:0,column:1,expected:['3']},{row:1,column:0,expected:['-1']}],
    concepts:['linear-feature-mixing','dense-jacobian'],
    hints:['Read each row of the affine map.','Nonzero weights are dependency evidence.','Both outputs mix both inputs.'],
    explanation:'The Jacobian equals the dense weight matrix. Unlike an element-wise activation, this operation mixes features.',
    neuralConnection:'Linear layers create cross-coordinate routes; following element-wise activations usually do not add new routes.'
  }),
  makeCase({
    id:'sample-block', level:14, title:'Independent Blocks', mode:'sample', difficulty:'hard',
    inputs:[input('x_1'),input('x_2'),input('x_3'),input('x_4')], intermediates:[],
    outputs:[
      output('y_1','x_1+x_2',sum(v('x_1'),v('x_2'))),
      output('y_2','x_1-x_2',sum(v('x_1'),negate(v('x_2')))),
      output('y_3','x_3^2',power(v('x_3'),2)),
      output('y_4','\\sin x_4',func('sin',v('x_4')))
    ],
    expectedJacobian:[['1','1','0','0'],['1','-1','0','0'],['0','0','2x_3','0'],['0','0','0','cos(x_4)']],
    classificationOptions:['square','diagonal','identity','sparse','dense','blockDiagonal'],
    derivativeTargets:[{row:2,column:2,expected:['2x_3','2*x_3']},{row:3,column:3,expected:['cos(x_4)','cosx_4','cos(x4)']}],
    concepts:['block-diagonal-jacobian'],
    hints:['Look for groups with no cross-group wires.','The first two coordinates form one coupled group.','x₃ and x₄ each form independent one-coordinate blocks.'],
    explanation:'No path crosses between {x₁,x₂} and {x₃,x₄}. The structural Jacobian separates into independent diagonal blocks.',
    neuralConnection:'Block structure lets groups of features backpropagate independently.'
  }),
  makeCase({
    id:'triangular-case', level:15, title:'Ordered Evidence', mode:'advanced', difficulty:'hard',
    inputs:[input('x_1'),input('x_2'),input('x_3')], intermediates:[],
    outputs:[output('y_1','x_1+x_2+x_3',sum(v('x_1'),v('x_2'),v('x_3'))),output('y_2','x_2+x_3',sum(v('x_2'),v('x_3'))),output('y_3','x_3',v('x_3'))],
    expectedJacobian:[['1','1','1'],['0','1','1'],['0','0','1']],
    classificationOptions:['square','diagonal','identity','sparse','dense','upperTriangular','lowerTriangular'],
    derivativeTargets:[{row:1,column:0,expected:['0']},{row:0,column:2,expected:['1']}],
    concepts:['upper-triangular-structure'],
    hints:['Inspect cells below the main diagonal.','Later outputs use only later-indexed inputs.','All cells below the diagonal are structurally zero.'],
    explanation:'The dependency pattern is upper triangular: no output below row i depends on an earlier input column.',
    neuralConnection:'Ordered dependency can constrain the direction in which coordinates influence one another.'
  }),
  makeCase({
    id:'sample-permuted', level:16, title:'Detective Bug Hunt', mode:'repair', difficulty:'hard',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','x_2',v('x_2')),output('y_2','x_1',v('x_1'))],
    expectedJacobian:[['0','1'],['1','0']],
    classificationOptions:['square','diagonal','identity','sparse','dense','permutationLike'],
    derivativeTargets:[{row:0,column:1,expected:['1']},{row:1,column:0,expected:['1']}],
    proposedBug:{message:'A junior detective labelled this square Jacobian “diagonal identity” and erased both crossing wires.', misconception:'square-means-diagonal'},
    concepts:['permutation-pattern','square-not-diagonal'],
    hints:['Matching dimensions do not dictate matching indices.','y₁ follows x₂ and y₂ follows x₁.','The two off-diagonal cells contain the evidence.'],
    explanation:'The coordinate swap is square and sparse but not diagonal. Its one-to-one links are permuted.',
    neuralConnection:'A permutation reroutes gradients between coordinates without mixing their values.'
  }),
  makeCase({
    id:'final-case', level:17, title:'Final Case File', mode:'mastery', difficulty:'hard',
    inputs:[input('x_1'),input('x_2'),input('x_3'),input('x_4')],
    intermediates:[
      intermediate('u','x_1+x_2',sum(v('x_1'),v('x_2'))),
      intermediate('v','x_3x_4',product(v('x_3'),v('x_4')))
    ],
    outputs:[
      output('y_1','u^2',power(ref('u'),2)),
      output('y_2','x_2+x_3',sum(v('x_2'),v('x_3'))),
      output('y_3','v+x_1',sum(ref('v'),v('x_1'))),
      output('y_4','\\operatorname{ReLU}(x_4)',func('relu',v('x_4')))
    ],
    expectedJacobian:[['2(x_1+x_2)','2(x_1+x_2)','0','0'],['0','1','1','0'],['1','0','x_4','x_3'],['0','0','0',"ReLU'(x_4)"]],
    evaluatedJacobian:[[6,6,0,0],[0,1,1,0],[1,0,2,-1],[0,0,0,1]],
    evaluationPoint:{x_1:1,x_2:2,x_3:-1,x_4:2},
    zeroReasons:{'0-2':'no-dependency','0-3':'no-dependency','1-0':'no-dependency','1-3':'no-dependency','2-1':'no-dependency','3-0':'no-dependency','3-1':'no-dependency','3-2':'no-dependency'},
    classificationOptions:['square','diagonal','identity','sparse','dense','blockDiagonal','upperTriangular','lowerTriangular'],
    derivativeTargets:[{row:0,column:0,expected:['2(x_1+x_2)','2*(x_1+x_2)','2x_1+2x_2']},{row:2,column:2,expected:['x_4','x4']},{row:2,column:3,expected:['x_3','x3']}],
    concepts:['indirect-dependency','cross-component-dependency','relu-jacobian','structural-zero'],
    hints:['Expand u and v before deciding dependencies.','Treat each output as one Jacobian row.','Separate path existence from evaluated slope values.'],
    explanation:'The final case combines two intermediate routes, cross-coordinate coupling, structural zeros, and an element-wise ReLU gate.',
    neuralConnection:'Real networks alternate feature-mixing and coordinate-wise operations; the Jacobian pattern reveals where gradients can interact.'
  }),
  makeCase({
    id:'sample-constant-output', level:6, title:'Constant Output', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2')], intermediates:[],
    outputs:[output('y_1','5',c(5)),output('y_2','x_1+x_2',sum(v('x_1'),v('x_2')))],
    expectedJacobian:[['0','0'],['1','1']],
    classificationOptions:['square','diagonal','sparse','dense','zeroRow'],
    derivativeTargets:[{row:0,column:0,expected:['0']},{row:0,column:1,expected:['0']}],
    concepts:['zero-row'], hints:['A constant output uses no input.','Inspect the entire first row.','No input can change y₁=5.'],
    explanation:'A constant output creates an all-zero Jacobian row.', neuralConnection:'That output sends no sensitivity back to any input.'
  }),
  makeCase({
    id:'sample-unused-input', level:7, title:'Unused Input', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2'),input('x_3')], intermediates:[],
    outputs:[output('y_1','x_1^2',power(v('x_1'),2)),output('y_2','x_1+x_2',sum(v('x_1'),v('x_2')))],
    expectedJacobian:[['2x_1','0','0'],['1','1','0']],
    classificationOptions:['sparse','dense','zeroColumn'],
    derivativeTargets:[{row:0,column:2,expected:['0']},{row:1,column:2,expected:['0']}],
    concepts:['zero-column'], hints:['Scan every output for x₃.','An unused input affects no row.','Its entire Jacobian column is zero.'],
    explanation:'x₃ influences no output, creating an all-zero column.', neuralConnection:'No loss gradient can reach an unused feature through this operation.'
  }),
  makeCase({
    id:'sample-elementwise-nonlinear', level:12, title:'Independent Nonlinear Coordinates', mode:'sample', difficulty:'medium',
    inputs:[input('x_1'),input('x_2'),input('x_3')], intermediates:[],
    outputs:[output('y_1','\\sin x_1',func('sin',v('x_1'))),output('y_2','e^{x_2}',func('exp',v('x_2'))),output('y_3','x_3^3',power(v('x_3'),3))],
    expectedJacobian:[['cos(x_1)','0','0'],['0','e^(x_2)','0'],['0','0','3x_3^2']],
    derivativeTargets:[{row:0,column:0,expected:['cos(x_1)','cosx_1','cos(x1)']},{row:2,column:2,expected:['3x_3^2','3*x_3^2']}],
    concepts:['element-wise-operation','diagonal-jacobian'], hints:['Each formula uses one matching coordinate.','Different nonlinear slopes still preserve diagonal structure.','Diagonal does not mean all diagonal values are one.'],
    explanation:'Independent unary functions produce a diagonal Jacobian with coordinate-specific slopes.', neuralConnection:'Sigmoid, tanh, and similar activations scale each gradient coordinate independently.'
  })
];

export const CASES_BY_ID = Object.fromEntries(CASES.map(item => [item.id, item]));
export const PRIMARY_LEVEL_CASES = Object.fromEntries(Array.from({length:17},(_,index)=>index+1).map(level => [level, CASES.find(item => item.level === level && item.id !== 'sample-constant-output' && item.id !== 'sample-unused-input' && item.id !== 'sample-elementwise-nonlinear')?.id]));

export function getCaseById(id) {
  const found = CASES_BY_ID[id];
  if (!found) throw new Error(`Unknown case: ${id}`);
  return found;
}

export function casesForLevel(level) {
  return CASES.filter(item => item.level === level);
}
