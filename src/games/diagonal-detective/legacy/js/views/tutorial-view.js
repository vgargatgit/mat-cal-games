import { displayMath, inlineMath } from '../math-renderer.js';

const STEPS=[
  {title:'Meet the case',body:'Begin with a vector-valued function. Do not differentiate yet.',math:'\\mathbf{y}=\\begin{bmatrix}x_1^2\\\\\\sin x_2\\\\3x_3\\end{bmatrix}',visual:'Three output case cards arrive at the agency.'},
  {title:'Identify inputs and outputs',body:'Numerator layout uses output rows and input columns.',math:'\\text{inputs: }x_1,x_2,x_3\\qquad\\text{outputs: }y_1,y_2,y_3',visual:'Inputs are suspects; outputs are affected locations.'},
  {title:'Trace y₁',body:'Freeze the other independent inputs. Which input can change y₁=x₁²?',math:'x_1\\longrightarrow y_1',visual:'One evidence wire connects x₁ to y₁.'},
  {title:'Trace every output',body:'Repeat the same dependency question for each output.',math:'x_1\\to y_1,\\qquad x_2\\to y_2,\\qquad x_3\\to y_3',visual:'Every output has exactly one matching input wire.'},
  {title:'Translate links into cells',body:'A link marks a potentially nonzero cell. A missing link forces a structural zero.',math:'J_{ij}=\\frac{\\partial y_i}{\\partial x_j}',visual:'Each output-input pair maps to one evidence-grid cell.'},
  {title:'Reveal the structure',body:'The dependency map appears before any derivative values.',math:'\\begin{bmatrix}\\bullet&0&0\\\\0&\\bullet&0\\\\0&0&\\bullet\\end{bmatrix}',visual:'The one-to-one wires align along the main diagonal.'},
  {title:'Calculate only surviving cells',body:'Now compute the diagonal slopes.',math:'\\begin{bmatrix}2x_1&0&0\\\\0&\\cos x_2&0\\\\0&0&3\\end{bmatrix}',visual:'Bullets turn into derivative expressions; zeros stay zeros.'},
  {title:'Classify the evidence',body:'Square: yes. Diagonal: yes. Identity: no. Sparse: yes. Element-wise: yes.',math:'\\text{diagonal structure comes from one-to-one dependency, not square shape alone}',visual:'Case closed: structure first, values second.'}
];

export function createTutorialView({step,onStep,onFinish}){
  const current=STEPS[step];const page=document.createElement('div');page.className='page';
  page.innerHTML=`<div class="page-heading"><div><span class="kicker">Interactive tutorial</span><h1>Investigate before differentiating</h1><p>Eight concise steps establish the evidence-board method.</p></div><span class="badge info">Step ${step+1} of 8</span></div>
  <section class="card tutorial-stage"><div class="step-dots" aria-label="Tutorial progress">${STEPS.map((_,i)=>`<span class="step-dot ${i===step?'active':''}" aria-hidden="true"></span>`).join('')}</div><span class="kicker">${current.title}</span><h2>${current.title}</h2><p>${current.body}</p>${displayMath(current.math)}<div class="tutorial-visual"><div class="case-note">${current.visual}</div></div><div class="row"><button class="btn secondary" data-action="previous" ${step===0?'disabled':''}>Previous</button><button class="btn accent" data-action="next">${step===STEPS.length-1?'Open first case':'Next clue'}</button></div></section>`;
  page.querySelector('[data-action="previous"]').addEventListener('click',()=>onStep(Math.max(0,step-1)));
  page.querySelector('[data-action="next"]').addEventListener('click',()=>step===STEPS.length-1?onFinish():onStep(step+1));
  return page;
}
