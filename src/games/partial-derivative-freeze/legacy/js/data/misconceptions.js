export const MISCONCEPTIONS = {
  'removed-frozen-multiplier': {
    title: 'Frozen multiplier removed',
    feedback: 'You differentiated the active factor but removed a frozen symbolic multiplier. Holding it constant means preserving it unchanged, not deleting it.'
  },
  'froze-mixed-term': {
    title: 'Entire mixed term frozen',
    feedback: 'The term still contains a path from the active variable to the output. Freeze only the independent factor, not the whole mixed term.'
  },
  'differentiated-independent-variable': {
    title: 'Independent input differentiated',
    feedback: 'No dependency was declared from this independent input to the active variable, so it contributes zero in this partial derivative.'
  },
  'wrong-active-variable': {
    title: 'Wrong active variable',
    feedback: 'The derivative notation names the variable that is allowed to change. Your reasoning followed a different variable.'
  },
  'treated-number-as-variable': {
    title: 'Numerical constant treated as variable',
    feedback: 'A numerical constant never depends on the differentiation variable. It remains a multiplier, or contributes zero as an isolated term.'
  },
  'deleted-constant-multiplier': {
    title: 'Constant multiplier deleted',
    feedback: 'The derivative of the active factor may be one, but its constant multiplier remains.'
  },
  'assumed-undeclared-dependency': {
    title: 'Undeclared dependency assumed',
    feedback: 'Variables are independent unless the round explicitly declares a functional dependency.'
  },
  'ignored-declared-dependency': {
    title: 'Declared dependency ignored',
    feedback: 'This round explicitly states that one variable depends on the active variable, so the indirect contribution must be included.'
  },
  'missed-dependency-path': {
    title: 'Dependency path missed',
    feedback: 'The output depends on the active variable through more than one route. Differentiate along every route and add the contributions.'
  },
  'multiplied-path-contributions': {
    title: 'Separate paths multiplied',
    feedback: 'Multiply local derivatives along one path, then add contributions from alternative paths.'
  },
  'missed-chain-factor': {
    title: 'Inner derivative omitted',
    feedback: 'You differentiated the outer function but did not multiply by the derivative of its inner expression.'
  },
  'unnecessary-product-rule': {
    title: 'Dependency not used to simplify',
    feedback: 'A full product rule is valid, but one factor is frozen. Recognizing that its derivative is zero makes the reasoning simpler.'
  },
  'partial-total-confusion': {
    title: 'Partial and total derivative confused',
    feedback: 'A partial derivative holds other independent inputs fixed. A total derivative also includes indirect changes through declared dependencies.'
  },
  'incorrect-shape': {
    title: 'Incorrect derivative shape',
    feedback: 'The output and selected input are both scalar, so this local derivative has scalar shape.'
  },
  'incorrect-final-expression': {
    title: 'Derivative expression mismatch',
    feedback: 'The assembled expression is not equivalent to the derivative implied by the dependency structure and selected rules.'
  }
};
