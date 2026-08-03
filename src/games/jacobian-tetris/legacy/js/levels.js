const phases = ['shape', 'dependencies', 'structure', 'values'];

export const PIECES = {
  scalar: { label: 'Scalar cell', icon: '□', description: 'One arbitrary derivative entry' },
  zero: { label: 'Zero block', icon: '▧', description: 'Structural independence' },
  identity: { label: 'Identity block', icon: 'I', description: 'Matching input-output lanes' },
  diagonal: { label: 'Diagonal block', icon: '◇', description: 'Element-wise derivative pattern' },
  row: { label: 'Reduction beam', icon: '━', description: 'One output row across inputs' },
  column: { label: 'Broadcast tower', icon: '┃', description: 'One scalar input reused by outputs' },
  dense: { label: 'Dense wall', icon: '▦', description: 'Several outputs depend on several inputs' },
  selection: { label: 'Selection block', icon: '↝', description: 'Sparse permutation-like mapping' },
  block: { label: 'Block dock', icon: '▤', description: 'Identity and zero sub-blocks' }
};

export const LEVELS = [
  {
    id: 1, title: 'One Cell Drop', operation: 'y = x²', objective: 'Build the scalar-to-scalar Jacobian.',
    input: ['x'], output: ['y'], expressions: ['x²'], entries: [['2x']], dependencies: [[true]], structure: 'scalar', phases,
    learning: 'A scalar derivative may be represented as a 1 × 1 Jacobian matrix.', mastery: 'orientation',
    hints: ['Count output components and input components.', 'There is one output row and one input column.', 'Differentiate x² with respect to x.', 'The entry is 2x.']
  },
  {
    id: 2, title: 'Identity Stack', operation: 'y = x', objective: 'Place the identity dependency pattern.',
    input: ['x₁','x₂','x₃'], output: ['y₁','y₂','y₃'], expressions: ['x₁','x₂','x₃'], entries: [['1','0','0'],['0','1','0'],['0','0','1']], dependencies: [[true,false,false],[false,true,false],[false,false,true]], structure: 'identity', phases,
    learning: 'Each output depends only on the matching input.', mastery: 'sparsity',
    hints: ['The board is square because input and output each have three components.', 'Trace each yᵢ back to its matching xᵢ.', 'Matching indices form a diagonal.', 'Use an identity block.']
  },
  {
    id: 3, title: 'Diagonal Drop', operation: 'yᵢ = xᵢ²', objective: 'Assemble a diagonal Jacobian and fill its slopes.',
    input: ['x₁','x₂','x₃'], output: ['y₁','y₂','y₃'], expressions: ['x₁²','x₂²','x₃²'], entries: [['2x₁','0','0'],['0','2x₂','0'],['0','0','2x₃']], dependencies: [[true,false,false],[false,true,false],[false,false,true]], structure: 'diagonal', phases,
    learning: 'Element-wise functions produce diagonal Jacobians.', mastery: 'diagonal',
    hints: ['Each yᵢ uses only xᵢ.', 'Off-diagonal cells are structural zeros.', 'Choose the diagonal block.', 'Differentiate each component separately.']
  },
  {
    id: 4, title: 'Dense Linear Wall', operation: 'y = Ax', objective: 'Recognize the coefficient matrix as the Jacobian.',
    input: ['x₁','x₂','x₃'], output: ['y₁','y₂'], expressions: ['2x₁ − x₂','3x₁ + 4x₂ + 5x₃'], entries: [['2','-1','0'],['3','4','5']], dependencies: [[true,true,false],[true,true,true]], structure: 'dense', phases,
    learning: 'For y = Ax, ∂y/∂x = A.', mastery: 'orientation',
    hints: ['Two outputs give two rows; three inputs give three columns.', 'Read coefficients from each output expression.', 'Most cells can be nonzero, so use a dense wall.', 'The first row is [2, −1, 0].']
  },
  {
    id: 5, title: 'Reduction Beam', operation: 'y = x₁ + x₂ + x₃', objective: 'Build the wide Jacobian of a reduction.',
    input: ['x₁','x₂','x₃'], output: ['y'], expressions: ['x₁ + x₂ + x₃'], entries: [['1','1','1']], dependencies: [[true,true,true]], structure: 'row', phases,
    learning: 'A scalar reduction creates one wide Jacobian row.', mastery: 'broadcast',
    hints: ['There is only one output.', 'Every input contributes to that output.', 'One output means one row, not one column.', 'Place a horizontal row-of-ones beam.']
  },
  {
    id: 6, title: 'Scalar Broadcast Tower', operation: 'y = x + b', objective: 'Differentiate the vector output with respect to scalar b.',
    input: ['b'], output: ['y₁','y₂','y₃'], expressions: ['x₁ + b','x₂ + b','x₃ + b'], entries: [['1'],['1'],['1']], dependencies: [[true],[true],[true]], structure: 'column', phases,
    learning: 'One scalar reused by three outputs produces a 3 × 1 Jacobian.', mastery: 'broadcast',
    hints: ['The differentiation input is b, which has one component.', 'Each output depends on b.', 'Three output rows and one input column make a tall board.', 'Use the broadcast tower.']
  },
  {
    id: 7, title: 'Repeated Variable Trap', operation: 'y = [x₁+x₂, x₁x₂]', objective: 'Build a dense nonlinear Jacobian row by row.',
    input: ['x₁','x₂'], output: ['y₁','y₂'], expressions: ['x₁ + x₂','x₁x₂'], entries: [['1','1'],['x₂','x₁']], dependencies: [[true,true],[true,true]], structure: 'dense', phases,
    learning: 'Dense means several cross-dependencies, not necessarily complicated derivatives.', mastery: 'sparsity',
    hints: ['Both outputs depend on both inputs.', 'No structural zero cells remain.', 'Differentiate the first expression, then the second.', 'The second row is [x₂, x₁].']
  },
  {
    id: 8, title: 'Selection Shuffle', operation: 'y = [x₃, x₁]', objective: 'Place a sparse selection Jacobian.',
    input: ['x₁','x₂','x₃'], output: ['y₁','y₂'], expressions: ['x₃','x₁'], entries: [['0','0','1'],['1','0','0']], dependencies: [[false,false,true],[true,false,false]], structure: 'selection', phases,
    learning: 'Selection creates a sparse permutation-like Jacobian.', mastery: 'sparsity',
    hints: ['y₁ copies x₃; y₂ copies x₁.', 'Mark only those two dependency cells.', 'Use the selection block.', 'Copied inputs have derivative 1.']
  },
  {
    id: 9, title: 'Concatenation Dock', operation: 'y = concat(a, b), differentiate with respect to a', objective: 'Assemble identity and zero blocks.',
    input: ['a₁','a₂'], output: ['y₁','y₂','y₃','y₄','y₅'], expressions: ['a₁','a₂','b₁','b₂','b₃'], entries: [['1','0'],['0','1'],['0','0'],['0','0'],['0','0']], dependencies: [[true,false],[false,true],[false,false],[false,false],[false,false]], structure: 'block', phases,
    learning: 'Block Jacobians combine identity and zero regions.', mastery: 'sparsity',
    hints: ['The output has five components; a has two.', 'Only the first two outputs depend on a.', 'The top block is I₂ and the lower block is zero.', 'Use the block dock.']
  },
  {
    id: 10, title: 'Chain Rule Drop', operation: 'u = Ax; y = u² element-wise', objective: 'Build local Jacobians, then connect them in composition order.',
    input: ['x₁','x₂'], output: ['y₁','y₂','y₃'], expressions: ['u₁²','u₂²','u₃²'], entries: [['2u₁','4u₁'],['0','-2u₂'],['6u₃','2u₃']], dependencies: [[true,true],[false,true],[true,true]], structure: 'dense', phases: [...phases, 'chain'],
    localJacobians: [{name:'∂y/∂u',shape:[3,3]},{name:'∂u/∂x',shape:[3,2]}], correctOrder: ['∂y/∂u','∂u/∂x'],
    learning: 'Local Jacobians multiply in function-composition order.', mastery: 'chain',
    hints: ['First build the final 3 × 2 Jacobian shape.', '∂y/∂u is 3 × 3 and ∂u/∂x is 3 × 2.', 'The matching inner dimensions must touch.', 'Use (∂y/∂u)(∂u/∂x).']
  },
  {
    id: 11, title: 'Vector–Jacobian Backprop', operation: 'Propagate ∇ᵧL backward through J', objective: 'Use the transpose gate for column gradients.',
    input: ['x₁','x₂'], output: ['L'], expressions: ['L(y(x))'], entries: [['g₁ + x₂g₂','g₁ + x₁g₂']], dependencies: [[true,true]], structure: 'row', phases: ['shape','chain'],
    localJacobians: [{name:'Jᵀ',shape:[2,2]},{name:'∇ᵧL',shape:[2,1]}], correctOrder: ['Jᵀ','∇ᵧL'],
    learning: 'Column gradients travel backward using Jᵀ∇ᵧL.', mastery: 'reverse',
    hints: ['The result is a gradient with respect to two inputs.', 'A column gradient reverses direction through Jᵀ.', 'Jᵀ is 2 × 2 and ∇ᵧL is 2 × 1.', 'Multiply Jᵀ∇ᵧL.']
  },
  {
    id: 12, title: 'Jacobian Tetris Certification', operation: 'u = Ax+b; v=tanh(u); L=v₁+v₂', objective: 'Assemble the full chain and certify every shape.',
    input: ['x₁','x₂','x₃'], output: ['L'], expressions: ['v₁ + v₂'], entries: [['d₁a₁₁ + d₂a₂₁','d₁a₁₂ + d₂a₂₂','d₁a₁₃ + d₂a₂₃']], dependencies: [[true,true,true]], structure: 'row', phases: ['shape','dependencies','structure','chain'],
    localJacobians: [{name:'∂L/∂v',shape:[1,2]},{name:'∂v/∂u',shape:[2,2]},{name:'∂u/∂x',shape:[2,3]}], correctOrder: ['∂L/∂v','∂v/∂u','∂u/∂x'],
    learning: 'Shape, structure, and order together make chain rule reliable.', mastery: 'chain',
    hints: ['L is scalar and x has three components.', 'The final Jacobian is 1 × 3.', 'Follow the graph backward from L to v to u to x.', 'Use (1×2)(2×2)(2×3).']
  }
];

export function getLevel(id) { return LEVELS.find(level => level.id === Number(id)); }
