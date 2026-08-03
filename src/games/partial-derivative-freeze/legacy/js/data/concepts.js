export const CONCEPTS = [
  {
    id: 'partial-derivative', title: 'Partial derivative', levels: [2, 3, 4],
    latex: '\\frac{\\partial f}{\\partial x}',
    definition: 'Change x while holding every other independent input fixed, then observe the local change in f.',
    example: '\\frac{\\partial}{\\partial x}(x^2+y)=2x',
    misconception: 'A frozen independent variable contributes zero only when its whole term has no active dependency.'
  },
  {
    id: 'frozen-multiplier', title: 'Frozen multiplier', levels: [3, 4, 5],
    latex: '\\frac{\\partial}{\\partial x}(x^2y)=2xy',
    definition: 'A factor independent of x stays fixed in value but remains in the derivative as a symbolic multiplier.',
    example: 'y\\,\\frac{\\partial x^2}{\\partial x}=2xy',
    misconception: 'Held constant does not mean erased.'
  },
  {
    id: 'independent-term', title: 'Independent term', levels: [1, 2, 4],
    latex: '\\frac{\\partial}{\\partial x}(3y)=0',
    definition: 'A whole term contributes zero when it has no dependency path from the active variable.',
    example: '\\frac{\\partial}{\\partial x}(x^2y+3y)=2xy+0',
    misconception: 'A term containing a frozen variable is not automatically zero if it also contains the active variable.'
  },
  {
    id: 'declared-dependency', title: 'Declared dependency', levels: [7, 8],
    latex: 'y=y(x)',
    definition: 'When a relationship is explicitly declared, a change in x can also change y.',
    example: '\\frac{d}{dx}(x^2y)=2xy+x^2\\frac{dy}{dx}',
    misconception: 'Do not assume a dependency that was not declared, and do not ignore one that was.'
  },
  {
    id: 'multiple-paths', title: 'Multiple dependency paths', levels: [8, 12],
    latex: '\\frac{df}{dx}=\\sum_{p}\\prod_{e\\in p}\\frac{\\partial \\text{child}}{\\partial \\text{parent}}',
    definition: 'Multiply local derivatives along each path, then add the contributions from separate paths.',
    example: 'x\\to u\\to f \\quad\\text{and}\\quad x\\to v\\to f',
    misconception: 'Separate path contributions are added, not multiplied.'
  },
  {
    id: 'gradient', title: 'Gradient under numerator layout', levels: [9, 10],
    latex: '\\frac{\\partial f}{\\partial \\mathbf{x}}=\\begin{bmatrix}\\frac{\\partial f}{\\partial x_1}&\\cdots&\\frac{\\partial f}{\\partial x_n}\\end{bmatrix}',
    definition: 'Each scalar partial derivative fills one component of the gradient row.',
    example: '\\frac{\\partial f}{\\partial \\mathbf{x}}=\\begin{bmatrix}2xy&x^2+3\\end{bmatrix}',
    misconception: 'Component order must match the declared input-vector order.'
  },
  {
    id: 'neuron-local', title: 'Neuron local derivative', levels: [10],
    latex: 'z=w_1x_1+w_2x_2+b',
    definition: 'A local derivative isolates how one neuron quantity changes with one selected scalar input or parameter.',
    example: '\\frac{\\partial z}{\\partial w_1}=x_1',
    misconception: 'The frozen input x₁ remains as the multiplier of the active weight w₁.'
  }
];
