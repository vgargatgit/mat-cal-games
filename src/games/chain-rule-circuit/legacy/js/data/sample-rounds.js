const scalar = { rows: 1, columns: 1, semanticType: 'scalar' };
const vector = length => ({ rows: length, columns: 1, semanticType: 'vector' });
const matrix = (rows, columns) => ({ rows, columns, semanticType: 'matrix' });

const node = (
  id,
  role,
  label,
  operation = null,
  position = null,
  shape = scalar,
  extras = {}
) => ({ id, role, label, shape: { ...shape }, operation, position, ...extras });

const edge = (
  from,
  to,
  expression,
  value = null,
  shape = scalar,
  inputIndex = 0
) => ({
  from,
  to,
  inputIndex,
  localDerivative: { expression, value, shape: { ...shape } }
});

function scalarRound(config) {
  return {
    difficulty: 'medium',
    taskType: 'chain',
    inputId: 'x',
    outputId: 'y',
    incomingGradient: null,
    accepted: [config.answer],
    concepts: ['chain-rule'],
    hints: [
      'Trace every route from the selected input to the output.',
      'Multiply all local derivatives on one route.',
      'Add completed contributions from distinct routes.'
    ],
    ...config
  };
}

export const SAMPLE_ROUNDS = [
  scalarRound({
    id: 'sample-01',
    level: 4,
    title: 'Two-stage scalar chain',
    expression: 'y=\\sin(x^2)',
    assignments: ['u=x^2', 'y=\\sin u'],
    answer: '2x cos(x^2)',
    accepted: ['2x cos(x^2)', '2xcos(x^2)', 'cos(u)*2x'],
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 70, y: 165 }),
        node('u', 'intermediate', 'u = x²', { type: 'square' }, { x: 330, y: 165 }),
        node('y', 'output', 'y = sin u', { type: 'sin' }, { x: 625, y: 165 })
      ],
      edges: [edge('x', 'u', '2x'), edge('u', 'y', 'cos(u)')]
    },
    expectedPaths: [['x', 'u', 'y']],
    expectedProduct: ['cos(u)', '2x'],
    explanation: 'The only route passes through square and sine, so their local slopes multiply.'
  }),
  scalarRound({
    id: 'sample-02',
    level: 5,
    title: 'Three-stage chain',
    expression: 'y=(x^2+1)^3',
    assignments: ['u=x^2', 'v=u+1', 'y=v^3'],
    answer: '6x(x^2+1)^2',
    accepted: ['6x(x^2+1)^2', '3v^2*1*2x'],
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 36, y: 165 }),
        node('u', 'intermediate', 'u=x²', { type: 'square' }, { x: 225, y: 165 }),
        node('v', 'intermediate', 'v=u+1', { type: 'add' }, { x: 425, y: 165 }),
        node('y', 'output', 'y=v³', { type: 'power', params: { exponent: 3 } }, { x: 655, y: 165 })
      ],
      edges: [edge('x', 'u', '2x'), edge('u', 'v', '1'), edge('v', 'y', '3v²')]
    },
    expectedPaths: [['x', 'u', 'v', 'y']],
    expectedProduct: ['3v²', '1', '2x'],
    explanation: 'Every serial edge appears once, ordered from y backward to x.'
  }),
  scalarRound({
    id: 'sample-03',
    level: 7,
    title: 'Incoming gradient injector',
    expression: 'g=\\partial L/\\partial y',
    assignments: ['y=f(x)', 'L=\\ell(y)'],
    answer: 'g dy/dx',
    accepted: ['g dy/dx', 'g*dy/dx'],
    incomingGradient: 'g',
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 118, y: 165 }),
        node('y', 'output', 'y=f(x)', { type: 'identity' }, { x: 600, y: 165 })
      ],
      edges: [edge('x', 'y', 'dy/dx')]
    },
    expectedPaths: [['x', 'y']],
    expectedProduct: ['g', 'dy/dx'],
    explanation: 'The incoming gradient is the leftmost factor on the same backward route.'
  }),
  scalarRound({
    id: 'sample-04',
    level: 8,
    title: 'Two paths',
    expression: 'y=x^2+3x',
    assignments: ['u=x^2', 'v=3x', 'y=u+v'],
    answer: '2x+3',
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 55, y: 165 }),
        node('u', 'intermediate', 'u=x²', { type: 'square' }, { x: 315, y: 83 }),
        node('v', 'intermediate', 'v=3x', { type: 'multiply' }, { x: 315, y: 247 }),
        node('y', 'output', 'y=u+v', { type: 'add' }, { x: 635, y: 165 })
      ],
      edges: [
        edge('x', 'u', '2x'),
        edge('x', 'v', '3'),
        edge('u', 'y', '1', 1),
        edge('v', 'y', '1', 1)
      ]
    },
    expectedPaths: [['x', 'u', 'y'], ['x', 'v', 'y']],
    expectedProduct: ['2x', '3'],
    concepts: ['multiple-paths', 'gradient-accumulation'],
    explanation: 'The square route contributes 2x and the scaling route contributes 3; the completed routes add.'
  }),
  scalarRound({
    id: 'sample-05',
    level: 11,
    title: 'Residual path',
    expression: 'y=x^2+x',
    assignments: ['u=x^2', 'y=u+x'],
    answer: '2x+1',
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 55, y: 165 }),
        node('u', 'intermediate', 'u=x²', { type: 'square' }, { x: 335, y: 83 }),
        node('y', 'output', 'y=u+x', { type: 'add' }, { x: 635, y: 165 })
      ],
      edges: [edge('x', 'u', '2x'), edge('u', 'y', '1'), edge('x', 'y', '1')]
    },
    expectedPaths: [['x', 'u', 'y'], ['x', 'y']],
    expectedProduct: ['2x', '1'],
    concepts: ['residual', 'multiple-paths'],
    explanation: 'The identity skip is a second dependency route and contributes 1.'
  }),
  scalarRound({
    id: 'sample-06',
    level: 12,
    title: 'Product rule as paths',
    expression: 'y=x^2\\sin x',
    assignments: ['u=x^2', 'v=\\sin x', 'y=uv'],
    answer: '2x sin(x)+x^2 cos(x)',
    accepted: ['2x sin(x)+x^2 cos(x)', 'v*2x+u*cos(x)'],
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 45, y: 165 }),
        node('u', 'intermediate', 'u=x²', { type: 'square' }, { x: 305, y: 78 }),
        node('v', 'intermediate', 'v=sin x', { type: 'sin' }, { x: 305, y: 252 }),
        node('y', 'output', 'y=uv', { type: 'multiply' }, { x: 635, y: 165 })
      ],
      edges: [
        edge('x', 'u', '2x'),
        edge('x', 'v', 'cos(x)'),
        edge('u', 'y', 'v'),
        edge('v', 'y', 'u')
      ]
    },
    expectedPaths: [['x', 'u', 'y'], ['x', 'v', 'y']],
    expectedProduct: ['v*2x', 'u*cos(x)'],
    concepts: ['product-rule', 'multiple-paths'],
    explanation: 'Each active input of the multiplication gate creates one chain-rule route.'
  }),
  {
    id: 'sample-07',
    level: 13,
    title: 'Vector shape chain',
    taskType: 'shape',
    expression: 'x∈R⁴ → u∈R³ → y∈R²',
    assignments: ['∂y/∂u : 2×3', '∂u/∂x : 3×4'],
    answer: '2x4',
    accepted: ['2x4', '2×4'],
    expectedShape: { rows: 2, columns: 4 },
    shapeBlocks: [
      { rows: 2, columns: 3, label: '∂y/∂u' },
      { rows: 3, columns: 4, label: '∂u/∂x' }
    ],
    expectedPaths: [],
    expectedProduct: [],
    concepts: ['vector-chain'],
    hints: ['Begin with the derivative nearest y.', 'Match the two inner dimensions.'],
    explanation: '(2×3)(3×4) produces a 2×4 Jacobian.'
  },
  {
    id: 'sample-08',
    level: 14,
    title: 'Numerical Jacobian chain',
    taskType: 'matrix',
    expression: 'AB',
    assignments: ['A=[[1,2],[0,3]]', 'B=[[4,0],[5,1]]'],
    answer: '14,2;15,3',
    accepted: ['14,2;15,3', '[[14,2],[15,3]]'],
    matrices: [
      [[1, 2], [0, 3]],
      [[4, 0], [5, 1]]
    ],
    expectedMatrix: [[14, 2], [15, 3]],
    expectedPaths: [],
    expectedProduct: [],
    concepts: ['vector-chain'],
    hints: ['Use row-by-column products.', 'Do not swap A and B.'],
    explanation: 'The ordered product AB is [[14,2],[15,3]].'
  },
  scalarRound({
    id: 'sample-09',
    level: 15,
    title: 'Element-wise then reduction',
    expression: 'p=x⊙y, s=Σpᵢ',
    assignments: ['p=x⊙y', 's=Σᵢpᵢ'],
    answer: 'y^T',
    accepted: ['y^T', 'yᵀ'],
    inputId: 'x',
    outputId: 's',
    graph: {
      nodes: [
        node('x', 'input', 'x ∈ R³', null, { x: 45, y: 88 }, vector(3)),
        node('q', 'input', 'y ∈ R³', null, { x: 45, y: 242 }, vector(3)),
        node('p', 'intermediate', 'p=x⊙y', { type: 'elementwiseMultiply' }, { x: 340, y: 165 }, vector(3)),
        node('s', 'output', 's=Σpᵢ', { type: 'sum' }, { x: 650, y: 165 })
      ],
      edges: [
        edge('x', 'p', 'diag(y)', null, matrix(3, 3)),
        edge('q', 'p', 'diag(x)', null, matrix(3, 3)),
        edge('p', 's', '1ᵀ', null, matrix(1, 3))
      ]
    },
    expectedPaths: [['x', 'p', 's']],
    expectedProduct: ['1ᵀ', 'diag(y)'],
    concepts: ['vector-chain'],
    explanation: 'The row of ones times diag(y) selects yᵀ.'
  }),
  scalarRound({
    id: 'sample-10',
    level: 16,
    title: 'Broadcast then sum',
    expression: 'u=x+z, s=Σuᵢ, x∈R³',
    assignments: ['u=x+z', 's=Σᵢuᵢ'],
    answer: '3',
    inputId: 'z',
    outputId: 's',
    graph: {
      nodes: [
        node('z', 'input', 'z scalar', null, { x: 45, y: 242 }),
        node('x', 'input', 'x ∈ R³', null, { x: 45, y: 88 }, vector(3)),
        node('u', 'intermediate', 'u=x+z', { type: 'broadcastAdd' }, { x: 340, y: 165 }, vector(3)),
        node('s', 'output', 's=Σuᵢ', { type: 'sum' }, { x: 650, y: 165 })
      ],
      edges: [
        edge('z', 'u', '1₃', null, matrix(3, 1)),
        edge('x', 'u', 'I₃', null, matrix(3, 3)),
        edge('u', 's', '1ᵀ', null, matrix(1, 3))
      ]
    },
    expectedPaths: [['z', 'u', 's']],
    expectedProduct: ['1ᵀ', '1₃'],
    concepts: ['vector-chain'],
    explanation: 'The scalar reaches three lanes; summing their three unit sensitivities gives 3.'
  }),
  scalarRound({
    id: 'sample-11',
    level: 17,
    title: 'Element-wise activation chain',
    expression: 'a=g(z), L=Σaᵢ',
    assignments: ['a=g(z) element-wise', 'L=Σᵢaᵢ'],
    answer: "[g'(z1),g'(z2),...,g'(zn)]",
    accepted: ["[g'(z1),g'(z2),...,g'(zn)]", "g'(z)^T"],
    inputId: 'z',
    outputId: 'L',
    graph: {
      nodes: [
        node('z', 'input', 'z ∈ R³', null, { x: 75, y: 165 }, vector(3)),
        node('a', 'intermediate', 'a=g(z)', { type: 'elementwiseActivation' }, { x: 355, y: 165 }, vector(3)),
        node('L', 'output', 'L=Σaᵢ', { type: 'sum' }, { x: 650, y: 165 })
      ],
      edges: [
        edge('z', 'a', "diag(g'(z))", null, matrix(3, 3)),
        edge('a', 'L', '1ᵀ', null, matrix(1, 3))
      ]
    },
    expectedPaths: [['z', 'a', 'L']],
    expectedProduct: ['1ᵀ', "diag(g'(z))"],
    explanation: 'The diagonal Jacobian scales each incoming lane independently.'
  }),
  scalarRound({
    id: 'sample-12',
    level: 18,
    title: 'ReLU gate',
    expression: 'a=ReLU(z), L=(a-y)^2',
    assignments: ['a=ReLU(z)', 'L=(a-y)^2'],
    answer: '0',
    accepted: ['0'],
    inputId: 'z',
    outputId: 'L',
    graph: {
      nodes: [
        node('z', 'input', 'z < 0', null, { x: 65, y: 165 }),
        node('a', 'intermediate', 'a=ReLU(z)', { type: 'relu' }, { x: 355, y: 165 }, scalar, { gateClosed: true }),
        node('L', 'output', 'L=(a-y)²', { type: 'square' }, { x: 650, y: 165 })
      ],
      edges: [edge('z', 'a', '0', 0), edge('a', 'L', '2(a-y)')]
    },
    expectedPaths: [['z', 'a', 'L']],
    expectedProduct: ['2(a-y)', '0'],
    concepts: ['relu'],
    explanation: "For z<0 the dependency remains, but ReLU's local derivative blocks the backward gradient. This game sets ReLU'(0)=0."
  }),
  scalarRound({
    id: 'sample-13',
    level: 19,
    title: 'Neuron weight gradient',
    expression: 'z=wᵀx+b, a=ReLU(z), L=(a-y)^2',
    assignments: ['z=wᵀx+b', 'a=ReLU(z)', 'L=(a-y)^2'],
    answer: "2(a-y) ReLU'(z) x^T",
    accepted: ["2(a-y) ReLU'(z) x^T", "2(a-y)*relu'(z)*x^t"],
    inputId: 'w',
    outputId: 'L',
    graph: {
      nodes: [
        node('w', 'input', 'w ∈ R³', null, { x: 35, y: 165 }, vector(3)),
        node('z', 'intermediate', 'z=wᵀx+b', { type: 'affine' }, { x: 245, y: 165 }),
        node('a', 'intermediate', 'a=ReLU(z)', { type: 'relu' }, { x: 455, y: 165 }),
        node('L', 'output', 'L=(a-y)²', { type: 'square' }, { x: 670, y: 165 })
      ],
      edges: [
        edge('w', 'z', 'xᵀ', null, matrix(1, 3)),
        edge('z', 'a', "ReLU'(z)"),
        edge('a', 'L', '2(a-y)')
      ]
    },
    expectedPaths: [['w', 'z', 'a', 'L']],
    expectedProduct: ['2(a-y)', "ReLU'(z)", 'xᵀ'],
    concepts: ['relu', 'incoming-gradient'],
    explanation: 'Backpropagation is the same ordered local product through loss, activation, and affine gates.'
  }),
  scalarRound({
    id: 'sample-14',
    level: 10,
    title: 'Shared intermediate accumulation',
    expression: 'u=x², v=u+1, w=3u, y=v+w',
    assignments: ['u=x²', 'v=u+1', 'w=3u', 'y=v+w'],
    answer: '8x',
    accepted: ['8x', '4*2x'],
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 28, y: 165 }),
        node('u', 'intermediate', 'u=x²', { type: 'square' }, { x: 205, y: 165 }),
        node('v', 'intermediate', 'v=u+1', { type: 'add' }, { x: 410, y: 78 }),
        node('w', 'intermediate', 'w=3u', { type: 'multiply' }, { x: 410, y: 252 }),
        node('y', 'output', 'y=v+w', { type: 'add' }, { x: 670, y: 165 })
      ],
      edges: [
        edge('x', 'u', '2x'),
        edge('u', 'v', '1'),
        edge('u', 'w', '3'),
        edge('v', 'y', '1'),
        edge('w', 'y', '1')
      ]
    },
    expectedPaths: [['x', 'u', 'v', 'y'], ['x', 'u', 'w', 'y']],
    expectedProduct: ['2x', '6x'],
    concepts: ['gradient-accumulation'],
    explanation: 'At u, the returning contributions 1 and 3 accumulate to 4 before multiplying by du/dx=2x.'
  })
];

export const ROUND_BY_ID = Object.fromEntries(SAMPLE_ROUNDS.map(round => [round.id, round]));

const CUSTOM_LEVELS = {
  1: {
    base: 0,
    guidedStages: [0, 0],
    title: 'Split the Expression',
    taskType: 'decomposition',
    expression: 'y=(x+1)^2',
    assignments: ['u=x+1', 'y=u^2'],
    answer: '2(x+1)',
    accepted: ['2(x+1)', '2x+2'],
    graph: {
      nodes: [
        node('x', 'input', 'x', null, { x: 70, y: 165 }),
        node('u', 'intermediate', 'u=x+1', { type: 'add' }, { x: 330, y: 165 }),
        node('y', 'output', 'y=u²', { type: 'square' }, { x: 625, y: 165 })
      ],
      edges: [edge('x', 'u', '1'), edge('u', 'y', '2u')]
    },
    expectedPaths: [['x', 'u', 'y']],
    expectedProduct: ['2u', '1'],
    explanation: 'The inner add-one operation becomes u, then the square operation maps u to y.'
  },
  2: { base: 0, guidedStages: [1, 1], title: 'Build the Forward Circuit', scenarioTitle: 'Shared circuit · pass 1 of 3: topology', taskType: 'graph' },
  3: { base: 0, guidedStages: [2, 2], title: 'Label Local Derivatives', scenarioTitle: 'Shared circuit · pass 2 of 3: local sensitivities', taskType: 'local' },
  4: { guidedStages: [3, 4], scenarioTitle: 'Shared circuit · pass 3 of 3: chain product' },
  6: {
    base: 1,
    title: 'Replace Intermediate Variables',
    answer: '6x(x^2+1)^2',
    accepted: ['6x(x^2+1)^2']
  },
  9: { base: 3, title: 'Multiply Within, Add Between' },
  20: {
    base: 0,
    title: 'Circuit Bug Hunter',
    taskType: 'repair',
    expression: 'Broken: dy/dx = cos(u) + 2x',
    assignments: ['u=x^2', 'y=sin(u)'],
    answer: 'multiply',
    accepted: ['multiply', '×', 'cos(u)*2x'],
    expectedProduct: ['cos(u)', '2x'],
    explanation: 'The displayed derivation added two gains on one serial route. Replace the plus junction with multiplication.'
  },
  21: {
    base: 10,
    title: 'Mixed Scalar and Vector Circuit',
    expression: 'u=Ax, v=g(u), s=Σvᵢ',
    assignments: ['u=Ax', 'v=g(u) element-wise', 's=Σᵢvᵢ'],
    answer: "1^T diag(g'(u)) A",
    accepted: ["1^T diag(g'(u)) A", "1ᵀdiag(g'(u))A"],
    inputId: 'x',
    outputId: 's',
    graph: {
      nodes: [
        node('x', 'input', 'x ∈ R⁴', null, { x: 35, y: 165 }, vector(4)),
        node('u', 'intermediate', 'u=Ax ∈ R³', { type: 'affine' }, { x: 245, y: 165 }, vector(3)),
        node('v', 'intermediate', 'v=g(u) ∈ R³', { type: 'elementwiseActivation' }, { x: 465, y: 165 }, vector(3)),
        node('s', 'output', 's=Σvᵢ', { type: 'sum' }, { x: 680, y: 165 })
      ],
      edges: [
        edge('x', 'u', 'A', null, matrix(3, 4)),
        edge('u', 'v', "diag(g'(u))", null, matrix(3, 3)),
        edge('v', 's', '1ᵀ', null, matrix(1, 3))
      ]
    },
    expectedPaths: [['x', 'u', 'v', 's']],
    expectedProduct: ['1ᵀ', "diag(g'(u))", 'A'],
    concepts: ['vector-chain', 'gradient-accumulation'],
    explanation: 'The shapes are (1×3)(3×3)(3×4)=1×4, and the output-nearest derivative stays on the left.'
  },
  22: {
    base: 12,
    title: 'Final Circuit Certification',
    expression: 'z=wᵀx+b, a=ReLU(z), L=(a-y)^2',
    assignments: ['z=wᵀx+b', 'a=ReLU(z)', 'L=(a-y)^2'],
    answer: "2(a-y) ReLU'(z) x^T",
    accepted: ["2(a-y) ReLU'(z) x^T", "2(a-y)*relu'(z)*x^t"],
    explanation: 'The complete circuit labels, orders, and propagates every local derivative as one backward pass.'
  }
};

function cloneGraph(graph) {
  if (!graph) return undefined;
  return {
    nodes: graph.nodes.map(item => ({
      ...item,
      shape: item.shape ? { ...item.shape } : item.shape,
      position: item.position ? { ...item.position } : item.position,
      operation: item.operation ? {
        ...item.operation,
        params: item.operation.params ? { ...item.operation.params } : item.operation.params
      } : item.operation
    })),
    edges: graph.edges.map(item => ({
      ...item,
      localDerivative: item.localDerivative ? {
        ...item.localDerivative,
        shape: item.localDerivative.shape ? { ...item.localDerivative.shape } : item.localDerivative.shape
      } : item.localDerivative
    }))
  };
}

export function roundForLevel(level, mode = 'guided') {
  const exact = SAMPLE_ROUNDS.find(round => round.level === level);
  const custom = CUSTOM_LEVELS[level];
  const source = exact ?? SAMPLE_ROUNDS[custom?.base ?? ((level - 1) % SAMPLE_ROUNDS.length)];
  const merged = { ...source, ...(custom ?? {}) };
  const round = {
    ...merged,
    graph: cloneGraph(merged.graph),
    assignments: [...(merged.assignments ?? [])],
    accepted: [...(merged.accepted ?? [merged.answer])],
    expectedPaths: (merged.expectedPaths ?? []).map(path => [...path]),
    expectedProduct: [...(merged.expectedProduct ?? [])],
    hints: [...(merged.hints ?? [])],
    concepts: [...(merged.concepts ?? [])],
    id: exact?.id ?? `level-${level}-${source.id}`,
    level,
    mode
  };
  delete round.base;
  delete round.guidedStages;

  if (mode === 'guided' && custom?.guidedStages) {
    [round.stageStart, round.stageEnd] = custom.guidedStages;
  }

  if (mode === 'repair') {
    round.taskType = 'repair';
    round.title = `Repair: ${round.title}`;
    if (!round.expression.startsWith('Broken')) round.expression = `Broken circuit · ${round.expression}`;
  }
  if (mode === 'mastery') {
    round.title = `Mastery challenge: ${round.title}`;
    round.hints = [];
  }
  return round;
}
