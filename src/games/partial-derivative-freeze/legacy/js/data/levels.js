import { constant as c, variable as v, dependentVariable as dv, sum, product, power, fn } from '../math/expression-model.js';
import { deriveExpression } from '../math/symbolic-derivative.js';
import { classifyTerms } from '../math/dependency-analysis.js';
import { toLatex, toPlain } from '../math/expression-model.js';

const variableSpec = (name, role = 'independent') => ({ name, role });
const x = v('x'); const y = v('y'); const a = v('a'); const b = v('b');
const w1 = v('w1'); const w2 = v('w2'); const x1 = v('x1'); const x2 = v('x2');

function makeRound({
  id, level, title, outputName = 'f', expression, activeVariable,
  variables, derivativeType = 'partial', displayDefinitions = [], context = {},
  rules = [], hints = [], explanation = [], connection = '', difficulty = 'guided',
  graph = null, taskKind = 'standard', acceptedEquivalentForms = [], metadata = {}
}) {
  const expectedDerivative = deriveExpression(expression, activeVariable, context);
  const termDependencies = classifyTerms(expression, activeVariable, context).map((entry) => ({
    term: toPlain(entry.term), latex: toLatex(entry.term), dependsOnActiveVariable: entry.dependsOnActiveVariable, kind: entry.kind
  }));
  return {
    id, seed: Number(id.replace(/\D/g, '').slice(-6) || level * 1000), level, title, outputName,
    expression, activeVariable, variables, derivativeType, displayDefinitions, context,
    rules, hints, explanation, connection, difficulty, graph, taskKind, metadata,
    derivativeRequest: {
      type: derivativeType,
      numerator: outputName,
      denominator: activeVariable,
      latex: derivativeType === 'partial'
        ? `\\frac{\\partial ${outputName}}{\\partial ${activeVariable.replace(/(\D+)(\d+)/, '$1_{$2}')}}`
        : `\\frac{d${outputName}}{d${activeVariable}}`
    },
    expectedAnswer: {
      shape: { rows: 1, columns: 1, semanticType: 'scalar' },
      activeVariable,
      frozenVariables: variables.filter((item) => item.name !== activeVariable && item.role === 'independent').map((item) => item.name),
      termDependencies,
      derivativeAst: expectedDerivative,
      canonicalLatex: toLatex(expectedDerivative),
      canonicalPlain: toPlain(expectedDerivative),
      acceptedEquivalentForms
    }
  };
}

const standardHints = [
  'Which variable appears in the denominator of the derivative notation?',
  'Which other symbols are independent inputs and therefore held fixed?',
  'Which terms still contain a dependency path from the active variable?',
  'Preserve frozen multipliers while differentiating the active factors.'
];

export const SAMPLE_ROUNDS = [
  makeRound({ id: 'sample-001', level: 2, title: 'Independent additive input', expression: sum(power(x, 2), y), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'power', 'constant'], hints: standardHints, explanation: ['x is active.', 'y is independent and frozen.', 'x² changes through x.', 'y contributes zero.', 'The derivative is 2x.'], connection: 'This is the x-component of the gradient of f.' }),
  makeRound({ id: 'sample-002', level: 3, title: 'Frozen multiplier', expression: product(power(x, 2), y), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['constant-multiple', 'power'], hints: standardHints, explanation: ['x is active.', 'y is frozen.', 'The product still changes through x².', 'Preserve y and differentiate x².', 'The derivative is 2xy.'], connection: 'Frozen y remains as a local sensitivity scale.' }),
  makeRound({ id: 'sample-003', level: 3, title: 'Switch the active variable', expression: product(power(x, 2), y), activeVariable: 'y', variables: [variableSpec('x'), variableSpec('y')], rules: ['constant-multiple', 'identity'], hints: standardHints, explanation: ['y is active.', 'x is frozen.', 'x² remains as a multiplier.', 'The derivative of y is 1.', 'The derivative is x².'] }),
  makeRound({ id: 'sample-004', level: 3, title: 'Mixed changing and unchanged terms', expression: sum(product(power(x, 2), y), product(c(3), y)), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'constant-multiple', 'power', 'constant'], hints: standardHints, explanation: ['x is active and y is frozen.', 'x²y changes through x.', '3y has no path from x.', 'The two term derivatives are 2xy and 0.', 'The derivative is 2xy.'] }),
  makeRound({ id: 'sample-005', level: 4, title: 'Partial derivative with respect to y', expression: sum(product(power(x, 2), y), product(c(3), y)), activeVariable: 'y', variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'constant-multiple', 'identity'], hints: standardHints, explanation: ['y is active.', 'x² and 3 are fixed multipliers.', 'Both terms change through y.', 'The derivative is x² + 3.'] }),
  makeRound({ id: 'sample-006', level: 4, title: 'Sum and difference scanner', expression: sum(power(x, 3), product(c(2), x, y), product(c(-1), power(y, 2))), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'power', 'constant-multiple', 'constant'], hints: standardHints, explanation: ['Differentiate term by term.', 'x³ contributes 3x².', '2xy contributes 2y.', '−y² contributes zero.', 'The derivative is 3x² + 2y.'] }),
  makeRound({ id: 'sample-007', level: 4, title: 'Same expression, different variable', expression: sum(power(x, 3), product(c(2), x, y), product(c(-1), power(y, 2))), activeVariable: 'y', variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'power', 'constant-multiple', 'constant'], hints: standardHints, explanation: ['Differentiate with respect to y.', 'x³ contributes zero.', '2xy contributes 2x.', '−y² contributes −2y.', 'The derivative is 2x − 2y.'] }),
  makeRound({ id: 'sample-008', level: 6, title: 'Nested power', expression: power(sum(x, y), 2), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['chain', 'power', 'sum'], hints: [...standardHints, 'Differentiate the outer square, then the inner x+y.'], explanation: ['Let u=x+y.', 'The outer derivative is 2u.', 'The inner partial derivative with respect to x is 1.', 'Substitute u back.', 'The derivative is 2(x+y).'] }),
  makeRound({ id: 'sample-009', level: 6, title: 'Nested product', expression: fn('sin', product(x, y)), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['chain', 'constant-multiple'], hints: [...standardHints, 'The outer derivative is cosine; the inner derivative of xy with respect to x is y.'], explanation: ['Let u=xy.', 'The derivative of sin(u) is cos(u).', 'The inner partial derivative is y.', 'Multiply along the dependency path.', 'The derivative is y cos(xy).'] }),
  makeRound({ id: 'sample-010', level: 7, title: 'Explicit dependency', expression: product(power(x, 2), dv('y', ['x'])), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y', 'dependent')], derivativeType: 'total', displayDefinitions: ['y=y(x)', 'f(x)=x^2y(x)'], context: { dependencies: { y: ['x'] } }, rules: ['product', 'power'], hints: ['This round explicitly declares y=y(x).', 'Both x² and y(x) now change with x.', 'Use both product-rule contributions.'], explanation: ['y is not an independent frozen input.', 'Differentiate both factors with the product rule.', 'The first contribution is 2xy.', 'The second contribution is x² dy/dx.', 'Add them.'] }),
  makeRound({ id: 'sample-011', level: 8, title: 'Multiple paths', outputName: 'f', expression: sum(power(x, 2), product(c(3), x)), activeVariable: 'x', variables: [variableSpec('x')], derivativeType: 'total', displayDefinitions: ['u=x^2', 'v=3x', 'f=u+v'], rules: ['path-sum', 'power', 'constant-multiple'], graph: { nodes: ['x', 'u', 'v', 'f'], edges: [{ from: 'x', to: 'u', label: '2x' }, { from: 'u', to: 'f', label: '1' }, { from: 'x', to: 'v', label: '3' }, { from: 'v', to: 'f', label: '1' }] }, hints: ['Find every route from x to f.', 'There are two paths: through u and through v.', 'Add the path contributions.'], explanation: ['x influences f through u and v.', 'The u path contributes 1·2x.', 'The v path contributes 1·3.', 'Alternative paths add.', 'The derivative is 2x+3.'] }),
  makeRound({ id: 'sample-012', level: 10, title: 'Neuron weight derivative', outputName: 'z', expression: sum(product(w1, x1), product(w2, x2), b), activeVariable: 'w1', variables: [variableSpec('w1'), variableSpec('w2'), variableSpec('x1'), variableSpec('x2'), variableSpec('b')], rules: ['sum', 'constant-multiple', 'identity', 'constant'], hints: standardHints, explanation: ['w₁ is active.', 'x₁ is a frozen multiplier.', 'w₂x₂ and b have no dependency on w₁.', 'The derivative is x₁.'], connection: 'Backpropagation later multiplies an incoming gradient by this local derivative.' }),
  makeRound({ id: 'sample-013', level: 10, title: 'Neuron input derivative', outputName: 'z', expression: sum(product(w1, x1), product(w2, x2), b), activeVariable: 'x2', variables: [variableSpec('w1'), variableSpec('w2'), variableSpec('x1'), variableSpec('x2'), variableSpec('b')], rules: ['sum', 'constant-multiple', 'identity', 'constant'], hints: standardHints, explanation: ['x₂ is active.', 'w₂ remains as a frozen multiplier.', 'The other terms are independent of x₂.', 'The derivative is w₂.'], connection: 'This local derivative is the sensitivity passed toward input x₂.' }),
  makeRound({ id: 'sample-014', level: 10, title: 'Bias derivative', outputName: 'z', expression: sum(product(w1, x1), product(w2, x2), b), activeVariable: 'b', variables: [variableSpec('w1'), variableSpec('w2'), variableSpec('x1'), variableSpec('x2'), variableSpec('b')], rules: ['sum', 'identity', 'constant'], hints: standardHints, explanation: ['b is active.', 'Every weighted-input term is independent of b.', 'The derivative of b with respect to itself is 1.', 'The derivative is 1.'] }),
  {
    id: 'sample-015', seed: 15, level: 9, title: 'Build the gradient', taskKind: 'gradient', difficulty: 'guided', outputName: 'f',
    expression: sum(power(x, 2), product(x, y)), variables: [variableSpec('x'), variableSpec('y')], activeVariable: 'x', derivativeType: 'partial',
    displayDefinitions: ['f(x,y)=x^2+xy', '\\mathbf{x}=\\begin{bmatrix}x\\\\y\\end{bmatrix}'],
    derivativeRequest: { type: 'gradient', numerator: 'f', denominator: 'x-vector', latex: '\\frac{\\partial f}{\\partial\\mathbf{x}}' },
    expectedAnswer: { shape: { rows: 1, columns: 2, semanticType: 'row-vector' }, componentOrder: ['x', 'y'], components: [sum(product(c(2), x), y), x], canonicalLatex: '\\begin{bmatrix}2x+y & x\\end{bmatrix}', canonicalPlain: '[2x+y, x]' },
    rules: ['sum', 'power', 'constant-multiple'], hints: ['Calculate one partial derivative for each input in vector order.', 'The x-component is 2x+y.', 'The y-component is x.'],
    explanation: ['The scalar output gives one gradient row.', 'The first slot corresponds to x.', 'The second slot corresponds to y.', 'The gradient is [2x+y, x].'], connection: 'Each completed partial derivative occupies one gradient component.', metadata: {}
  },
  {
    id: 'bug-001', seed: 11001, level: 11, title: 'Bug Hunter: deleted multiplier', taskKind: 'bug-hunter', difficulty: 'repair',
    expression: product(power(x, 2), y), activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], derivativeType: 'partial', outputName: 'f',
    derivativeRequest: { type: 'partial', numerator: 'f', denominator: 'x', latex: '\\frac{\\partial f}{\\partial x}' },
    incorrectSteps: ['y is held fixed.', '\\frac{\\partial}{\\partial x}(x^2y)=\\frac{\\partial x^2}{\\partial x}', '2x'], firstIncorrectIndex: 1,
    expectedAnswer: { shape: { rows: 1, columns: 1, semanticType: 'scalar' }, canonicalLatex: '2xy', canonicalPlain: '2*x*y', derivativeAst: product(c(2), x, y), frozenVariables: ['y'], termDependencies: [{ term: 'x^2*y', latex: 'x^2y', dependsOnActiveVariable: true, kind: 'mixed' }] },
    rules: ['constant-multiple', 'power'], hints: ['The first statement is correct.', 'Find the first line where y disappears.', 'A frozen multiplier must remain.'], explanation: ['The error begins when y is removed from the derivative expression.', 'Treat y as a fixed multiplier.', 'The correction is y·2x=2xy.'], connection: 'Dependency-aware debugging is more reliable than memorizing surface patterns.', metadata: {}
  }
];

export const LEVELS = [
  { id: 1, title: 'Constants Stay Still', objective: 'Distinguish numerical constants from variables.', concepts: ['constant', 'identity', 'constant-multiple'], family: 'constant' },
  { id: 2, title: 'Freeze the Other Input', objective: 'Hold other independent scalar inputs fixed.', concepts: ['partial-derivative', 'independent-term'], family: 'linear' },
  { id: 3, title: 'Frozen Variables Can Remain', objective: 'Preserve frozen symbolic multipliers.', concepts: ['frozen-multiplier', 'constant-multiple'], family: 'frozen-multiplier' },
  { id: 4, title: 'Sum and Difference Scanner', objective: 'Differentiate additive terms independently.', concepts: ['sum', 'difference', 'independent-term'], family: 'polynomial' },
  { id: 5, title: 'Product Rule or Constant Multiple?', objective: 'Use dependency, not the multiplication sign alone, to choose a rule.', concepts: ['product', 'constant-multiple'], family: 'product' },
  { id: 6, title: 'Nested Expressions', objective: 'Multiply local derivatives along a nested path.', concepts: ['chain', 'intermediate-variable'], family: 'nested' },
  { id: 7, title: 'Independent or Dependent?', objective: 'Distinguish y from explicitly declared y(x).', concepts: ['declared-dependency', 'partial-total'], family: 'declared-dependency' },
  { id: 8, title: 'Multiple Dependency Paths', objective: 'Find every route from the active input to the output.', concepts: ['multiple-paths', 'path-sum'], family: 'paths' },
  { id: 9, title: 'Build a Gradient', objective: 'Place scalar partial derivatives into numerator-layout order.', concepts: ['gradient'], family: 'gradient' },
  { id: 10, title: 'Neural-Network Local Derivatives', objective: 'Differentiate an affine neuron locally.', concepts: ['neuron-local', 'gradient'], family: 'neuron' },
  { id: 11, title: 'Derivative Bug Hunter', objective: 'Find the first reasoning step that violates dependency structure.', concepts: ['diagnosis'], family: 'bug-hunter' },
  { id: 12, title: 'Freeze Challenge', objective: 'Integrate active-variable, freezing, paths, rules, and interpretation.', concepts: ['mastery-challenge'], family: 'challenge' }
];

export function roundsForLevel(level) {
  return SAMPLE_ROUNDS.filter((round) => round.level === Number(level));
}

export { makeRound, variableSpec, c, v, dv, sum, product, power, fn };
