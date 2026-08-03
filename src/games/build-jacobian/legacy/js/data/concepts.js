export const CONCEPTS = [
  {
    id: 'jacobian', title: 'Jacobian',
    definition: 'A table of local sensitivities. Cell Jᵢⱼ is ∂fᵢ/∂xⱼ.',
    visual: 'Rows: output gauges. Columns: input knobs.',
    example: 'For f=[x₁²+x₂, x₁x₂], J=[[2x₁,1],[x₂,x₁]].',
    misconception: 'The denominator does not choose the row under numerator layout.', level: 3,
  },
  {
    id: 'shape', title: 'Shape rule',
    definition: 'For f: ℝⁿ → ℝᵐ, the numerator-layout Jacobian has shape m×n.',
    visual: 'outputs × inputs', example: 'ℝ³ → ℝ² gives a 2×3 Jacobian.',
    misconception: 'Do not reverse the input and output counts.', level: 2,
  },
  {
    id: 'row', title: 'Jacobian row',
    definition: 'The gradient of one scalar output with respect to every input.',
    visual: 'Keep fᵢ fixed; sweep across x₁,…,xₙ.', example: 'Row 2 = [∂f₂/∂x₁,…,∂f₂/∂xₙ].',
    misconception: 'A row is not “all derivatives with respect to one input.”', level: 4,
  },
  {
    id: 'column', title: 'Jacobian column',
    definition: 'How every output responds when one selected input changes.',
    visual: 'Keep xⱼ active; move down all output gauges.', example: 'Column 1 = [∂f₁/∂x₁,…,∂fₘ/∂x₁]ᵀ.',
    misconception: 'A column contains different outputs, not repeated copies of one derivative.', level: 5,
  },
  {
    id: 'identity', title: 'Identity Jacobian',
    definition: 'The identity function f(x)=x has ones on the diagonal and structural zeros elsewhere.',
    visual: 'Each knob controls exactly its matching gauge with slope 1.', example: '∂x/∂x=I.',
    misconception: 'Square does not automatically mean identity.', level: 8,
  },
  {
    id: 'diagonal', title: 'Diagonal Jacobian',
    definition: 'Each output depends only on its corresponding input.',
    visual: 'Only matching knob-to-gauge wires exist.', example: '[x₁²,sin x₂] gives diag(2x₁,cos x₂).',
    misconception: 'A vector function can have cross-dependencies and need not be diagonal.', level: 9,
  },
  {
    id: 'structural-zero', title: 'Structural zero',
    definition: 'No dependency path exists from an input to an output.',
    visual: 'NO PATH', example: 'f₁=x₁² gives ∂f₁/∂x₂=0 for every point.',
    misconception: 'It is not caused by the current input value being zero.', level: 10,
  },
  {
    id: 'evaluated-zero', title: 'Evaluated zero',
    definition: 'A dependency exists, but its local slope happens to be zero at the chosen point.',
    visual: 'PATH EXISTS, SLOPE CURRENTLY ZERO', example: '∂(x₁²+x₂)/∂x₁=2x₁, which is 0 at x₁=0.',
    misconception: 'An evaluated zero does not erase the structural path.', level: 11,
  },
  {
    id: 'backprop', title: 'Local Jacobian in backpropagation',
    definition: 'A Jacobian is one local derivative block that participates in a chain-rule product.',
    visual: 'local change → local Jacobian → propagated change', example: 'For z=Wx+b, ∂z/∂x=W.',
    misconception: 'Backpropagation does not require memorizing one giant derivative at once.', level: 12,
  },
];
