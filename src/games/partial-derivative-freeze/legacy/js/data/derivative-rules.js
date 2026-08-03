export const DERIVATIVE_RULES = [
  { id: 'constant', label: 'Constant rule', short: 'Fixed term → 0', description: 'An expression with no dependency on the active variable contributes zero.' },
  { id: 'identity', label: 'Identity rule', short: 'd(x)/dx = 1', description: 'The derivative of the active variable with respect to itself is one.' },
  { id: 'constant-multiple', label: 'Constant-multiple rule', short: 'c·g → c·g′', description: 'Preserve factors that are constant with respect to the active variable.' },
  { id: 'power', label: 'Power rule', short: 'xⁿ → n·xⁿ⁻¹', description: 'Multiply by the exponent and reduce it by one.' },
  { id: 'sum', label: 'Sum / difference rule', short: 'Differentiate termwise', description: 'Differentiate each additive contribution separately.' },
  { id: 'product', label: 'Product rule', short: 'uv → u′v + uv′', description: 'Use both contributions when both factors depend on the active variable.' },
  { id: 'chain', label: 'Chain rule', short: 'Outer′ × inner′', description: 'Multiply local derivatives along a nested dependency path.' },
  { id: 'path-sum', label: 'Path-sum rule', short: 'Add separate paths', description: 'Alternative dependency-path contributions are added.' }
];

export const ruleById = (id) => DERIVATIVE_RULES.find((rule) => rule.id === id);
