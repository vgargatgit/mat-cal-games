import { el } from '../components/dom.js';

const N = text => ({ text, type:'node' });
const W = text => ({ text, type:'wire' });
const G = text => ({ text, type:'gain' });
const P = text => ({ text, type:'path' });

const STEPS = [
  {
    title:'Start with a nested expression',
    body:'A useful circuit exposes every operation instead of treating the expression as one opaque box.',
    eq:'\\[y=(x^2+1)^3\\]',
    visual:[N('x'), W('→'), N('square'), W('→'), N('add 1'), W('→'), N('cube'), W('→'), N('y')],
    tip:'Forward values move from the original input toward the final output.'
  },
  {
    title:'Introduce an intermediate',
    body:'Name the inside result before applying the outside operation.',
    eq:'\\[u=x^2+1,\\qquad y=u^3\\]',
    visual:[N('u = x² + 1'), W('then'), N('y = u³')],
    tip:'An intermediate gives one local edge to inspect during differentiation.'
  },
  {
    title:'Build the forward circuit',
    body:'Connect one operation per node. Forward dependency arrows always point from inputs toward outputs.',
    eq:'',
    visual:[N('x'), W('→'), N('square'), W('→'), N('add 1'), W('→'), N('u'), W('→'), N('cube'), W('→'), N('y')],
    tip:'The graph records structure; it does not yet contain a total derivative.'
  },
  {
    title:'Attach local derivatives',
    body:'Each wire label describes how its immediate destination responds to its immediate source.',
    eq:'\\[\\frac{du}{dx}=2x,\\qquad\\frac{dy}{du}=3u^2\\]',
    visual:[N('x'), W('→'), G('du/dx = 2x'), W('→'), N('u'), W('→'), G('dy/du = 3u²'), W('→'), N('y')],
    tip:'A forward value and a local derivative are different quantities.'
  },
  {
    title:'Trace the dependency path',
    body:'For this expression there is one route from x to y.',
    eq:'',
    visual:[P('x → u → y')],
    tip:'Every operation on the selected route contributes one local derivative factor.'
  },
  {
    title:'Multiply along the path',
    body:'Serial sensitivities multiply because one change passes through the next operation.',
    eq:'\\[\\frac{dy}{dx}=\\frac{dy}{du}\\frac{du}{dx}\\]',
    visual:[G('dy/du'), W('×'), G('du/dx')],
    tip:'Under numerator layout, start with the factor nearest the final output.'
  },
  {
    title:'Substitute the local gains',
    body:'Keep the output-nearest factor on the left and the input-nearest factor on the right.',
    eq:'\\[\\frac{dy}{dx}=3u^2\\cdot 2x\\]',
    visual:[G('3u²'), W('×'), G('2x')],
    tip:'The shared intermediate u links the two derivative blocks.'
  },
  {
    title:'Replace the intermediate',
    body:'When the question asks for the answer in x, substitute the saved forward expression for u.',
    eq:'\\[\\frac{dy}{dx}=6x(x^2+1)^2\\]',
    visual:[P('u ↦ x² + 1'), W('→'), N('6x(x²+1)²'), W('✓')],
    tip:'Keeping u is also mathematically valid when named intermediates are allowed.'
  },
  {
    title:'Preview multiple paths',
    body:'One input can influence the same output through more than one dependency route.',
    eq:'\\[u=x^2,\\quad v=3x,\\quad y=u+v\\]',
    visual:[P('route 1: x → u → y'), W('+'), P('route 2: x → v → y')],
    tip:'Complete each route product before combining the routes.'
  },
  {
    title:'Reveal the circuit law',
    body:'Within one route: multiply. Between separate routes: add. Backpropagation repeats this local process through a larger graph.',
    eq:'\\[\\frac{dy}{dx}=2x+3\\]',
    visual:[G('path through u = 2x'), W('+'), G('path through v = 3')],
    tip:'Multiply along paths. Add where paths meet.'
  }
];

function stepMap(current, onStep) {
  const list = el('div', { className:'tutorial-step-list' });
  STEPS.forEach((item, index) => {
    list.append(el('button', {
      className:`tutorial-step-button ${index === current ? 'current' : ''} ${index < current ? 'complete' : ''}`,
      onClick:() => onStep(index),
      'aria-current':index === current ? 'step' : null,
      'aria-label':`Tutorial step ${index + 1}: ${item.title}`
    },
    el('span', { className:'tutorial-step-number', text:index < current ? '✓' : String(index + 1) }),
    el('span', { text:item.title })
    ));
  });
  return el('aside', { className:'card tutorial-map' },
    el('header', {}, el('span', { className:'kicker', text:'Signal path' }), el('h2', { text:'Ten concise steps' })),
    list
  );
}

function tutorialVisual(parts) {
  const circuit = el('div', { className:'tutorial-circuit' });
  parts.forEach(part => {
    const className = part.type === 'wire' ? 'mini-wire' : part.type === 'gain' ? 'mini-gain' : part.type === 'path' ? 'mini-path' : 'mini-node';
    circuit.append(el('span', { className, text:part.text }));
  });
  return el('div', { className:'tutorial-visual' }, circuit);
}

export function createTutorialView({ step, onStep, onFinish }) {
  const item = STEPS[step];
  const shell = el('div', { className:'shell narrow' },
    el('div', { className:'view-heading' },
      el('div', {},
        el('span', { className:'kicker', text:'Interactive tutorial' }),
        el('h1', { text:'Wire the chain rule once' }),
        el('p', { text:'Follow one expression from nested formula to computation graph, local derivatives, and backward composition.' })
      )
    )
  );

  const stage = el('section', { className:'card tutorial-stage' },
    el('div', { className:'tutorial-stage-head' },
      el('div', {},
        el('span', { className:'kicker', text:`Tutorial ${step + 1} of ${STEPS.length}` }),
        el('h1', { text:item.title }),
        el('p', { text:item.body })
      ),
      el('span', { className:'badge info', text:`${Math.round((step + 1) / STEPS.length * 100)}% complete` })
    )
  );
  if (item.eq) stage.append(el('div', { className:'equation', text:item.eq }));
  stage.append(
    tutorialVisual(item.visual),
    el('div', { className:'tutorial-note' },
      el('span', { className:'tutorial-note-icon', text:'i', 'aria-hidden':'true' }),
      el('div', {}, el('strong', { text:'Why this matters' }), el('p', { text:item.tip }))
    ),
    el('div', { className:'step-dots', 'aria-label':`Step ${step + 1} of ${STEPS.length}` }, STEPS.map((_, index) => el('span', { className:`step-dot ${index === step ? 'active' : ''}` }))),
    el('div', { className:'button-row' },
      el('button', { className:'btn secondary', disabled:step === 0, onClick:() => onStep(step - 1), text:'← Back' }),
      step < STEPS.length - 1
        ? el('button', { className:'btn accent', onClick:() => onStep(step + 1), text:'Next signal →' })
        : el('button', { className:'btn green', onClick:onFinish, text:'Open Level 1 →' })
    )
  );

  shell.append(el('div', { className:'tutorial-layout' }, stepMap(step, onStep), stage));
  return shell;
}
