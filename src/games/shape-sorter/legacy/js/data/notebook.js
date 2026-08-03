export const NOTEBOOK_ENTRIES = [
  {
    title: 'Scalar → scalar',
    latex: 'f:\\mathbb{R}\\to\\mathbb{R}',
    derivative: '\\frac{df}{dx}',
    shape: 'scalar (1 × 1)',
    explanation: 'One output component and one input component.'
  },
  {
    title: 'Vector → scalar',
    latex: 'f:\\mathbb{R}^{n}\\to\\mathbb{R}',
    derivative: '\\frac{\\partial f}{\\partial \\mathbf{x}}',
    shape: '1 × n row vector',
    explanation: 'One output row and one column for each input component. This is the gradient in numerator layout.'
  },
  {
    title: 'Scalar → vector',
    latex: '\\mathbf{f}:\\mathbb{R}\\to\\mathbb{R}^{m}',
    derivative: '\\frac{\\partial \\mathbf{f}}{\\partial x}',
    shape: 'm × 1 column vector',
    explanation: 'One row per output component and one column for the scalar input.'
  },
  {
    title: 'Vector → vector',
    latex: '\\mathbf{f}:\\mathbb{R}^{n}\\to\\mathbb{R}^{m}',
    derivative: '\\frac{\\partial \\mathbf{f}}{\\partial \\mathbf{x}}',
    shape: 'm × n matrix',
    explanation: 'The Jacobian has output components as rows and input components as columns.'
  },
  {
    title: 'Chain-rule shapes',
    latex: '(m\\times p)(p\\times n)=m\\times n',
    derivative: '\\frac{\\partial \\mathbf{f}}{\\partial \\mathbf{x}}=\\frac{\\partial \\mathbf{f}}{\\partial \\mathbf{u}}\\frac{\\partial \\mathbf{u}}{\\partial \\mathbf{x}}',
    shape: 'inner dimensions match',
    explanation: 'The derivative nearest the final output appears on the left. Matching inner dimensions disappear.'
  },
  {
    title: 'Neuron weight gradient',
    latex: 'z=\\mathbf{w}^{T}\\mathbf{x}+b',
    derivative: '\\frac{\\partial z}{\\partial \\mathbf{w}}',
    shape: '1 × n row vector',
    explanation: 'A scalar neuron output differentiated with respect to an n-component weight vector.'
  }
];
