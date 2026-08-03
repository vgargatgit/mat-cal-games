import { SeededRandom } from './seeded-random.js';
import { makeRound, variableSpec, c, v, dv, sum, product, power, fn } from '../data/levels.js';

export function generateQuestion(level = 1, seed = Date.now(), weakness = null) {
  const rng = new SeededRandom(seed);
  const numericLevel = Number(level);
  if (weakness === 'removed-frozen-multiplier') return generateFrozenMultiplier(numericLevel, seed, rng);
  if (weakness === 'differentiated-independent-variable') return generatePolynomial(Math.max(2, numericLevel), seed, rng);
  if (weakness === 'partial-total-confusion') return generateDeclaredDependency(7, seed, rng);
  if (weakness === 'missed-dependency-path') return generatePaths(8, seed, rng);

  switch (numericLevel) {
    case 1: return generateConstant(seed, rng);
    case 2: return generateLinear(seed, rng);
    case 3: return generateFrozenMultiplier(3, seed, rng);
    case 4: return generatePolynomial(4, seed, rng);
    case 5: return generateProduct(5, seed, rng);
    case 6: return generateNested(6, seed, rng);
    case 7: return generateDeclaredDependency(7, seed, rng);
    case 8: return generatePaths(8, seed, rng);
    case 9: return generateGradient(seed, rng);
    case 10: return generateNeuron(seed, rng);
    case 11: return generateBugHunter(seed, rng);
    case 12: return rng.pick([generatePolynomial, generateProduct, generateNested, generateDeclaredDependency, generatePaths])(12, seed, rng);
    default: return generateLinear(seed, rng);
  }
}

function id(level, seed, family) {
  return `generated-l${level}-${family}-${Number(seed) >>> 0}`;
}

function generateConstant(seed, rng) {
  const exponent = rng.int(2, 4);
  const coefficient = rng.nonZeroInt(2, 5);
  const mode = rng.int(0, 2);
  let expression;
  let title;
  let rules;
  if (mode === 0) {
    expression = sum(power(v('x'), exponent), c(coefficient));
    title = 'Power plus a fixed number';
    rules = ['sum', 'power', 'constant'];
  } else if (mode === 1) {
    expression = product(c(coefficient), v('x'));
    title = 'Keep the numerical multiplier';
    rules = ['constant-multiple', 'identity'];
  } else {
    expression = c(coefficient);
    title = 'Constant-only specimen';
    rules = ['constant'];
  }
  return makeRound({ id: id(1, seed, 'constant'), level: 1, title, expression, activeVariable: 'x', variables: [variableSpec('x')], rules, hints: ['The number is permanently fixed.', 'Only expressions with a path from x can change.', 'Preserve a coefficient multiplying x.'], explanation: ['x is the selected variable.', 'Numerical constants do not depend on x.', 'Apply the local derivative rule and simplify.'], difficulty: 'generated' });
}

function generateLinear(seed, rng) {
  const active = rng.bool() ? 'x' : 'y';
  const a = rng.nonZeroInt(-5, 5);
  const b = rng.nonZeroInt(-5, 5);
  const k = rng.int(-5, 5);
  const expression = sum(product(c(a), v('x')), product(c(b), v('y')), c(k));
  return makeRound({ id: id(2, seed, 'linear'), level: 2, title: 'Switchable linear cold room', expression, activeVariable: active, variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'constant-multiple', 'constant'], hints: ['Read the denominator of the partial derivative.', `Hold ${active === 'x' ? 'y' : 'x'} fixed.`, 'Only one linear term changes.'], explanation: [`${active} is active.`, `${active === 'x' ? 'y' : 'x'} is independent and frozen.`, 'Differentiate each term separately.'], difficulty: 'generated' });
}

function generateFrozenMultiplier(level, seed, rng) {
  const active = rng.bool() ? 'x' : 'y';
  const other = active === 'x' ? 'y' : 'x';
  const activePower = rng.int(1, 4);
  const frozenPower = rng.int(1, 3);
  const coefficient = rng.nonZeroInt(-4, 4);
  const expression = product(c(coefficient), power(v(active), activePower), power(v(other), frozenPower));
  return makeRound({ id: id(level, seed, 'frozen'), level, title: 'Symbolic multiplier under frost', expression, activeVariable: active, variables: [variableSpec('x'), variableSpec('y')], rules: ['constant-multiple', 'power'], hints: [`${other} is held at a fixed value, not erased.`, `The term still changes through ${active}.`, `Differentiate ${active}^${activePower} and preserve the other factors.`], explanation: [`${active} is active.`, `${other} is frozen.`, 'The whole product still changes through the active factor.', 'All frozen factors remain as multipliers.'], difficulty: 'generated' });
}

function generatePolynomial(level, seed, rng) {
  const active = rng.bool() ? 'x' : 'y';
  const terms = [
    product(c(rng.nonZeroInt(-4, 4)), power(v('x'), rng.int(2, 4))),
    product(c(rng.nonZeroInt(-4, 4)), v('x'), v('y')),
    product(c(rng.nonZeroInt(-4, 4)), power(v('y'), rng.int(2, 4)))
  ];
  if (rng.bool()) terms.push(c(rng.nonZeroInt(-5, 5)));
  return makeRound({ id: id(level, seed, 'polynomial'), level, title: 'Term-by-term dependency scan', expression: sum(...terms), activeVariable: active, variables: [variableSpec('x'), variableSpec('y')], rules: ['sum', 'power', 'constant-multiple', 'constant'], hints: ['Classify each additive term before differentiating.', 'A mixed xy term changes with either active variable.', 'A term containing only the frozen input contributes zero.'], explanation: ['Apply the sum rule.', 'Preserve frozen factors inside mixed terms.', 'Remove only whole terms with no active dependency.'], difficulty: 'generated' });
}

function generateProduct(level, seed, rng) {
  const xNode = v('x');
  const expression = rng.bool()
    ? product(power(xNode, rng.int(2, 3)), fn(rng.bool() ? 'sin' : 'cos', xNode))
    : product(power(xNode, rng.int(2, 4)), v('y'));
  const independentY = expression.factors?.some((factor) => factor.type === 'variable' && factor.name === 'y');
  return makeRound({ id: id(level, seed, 'product'), level, title: independentY ? 'Constant multiple or full product rule?' : 'Two active factors', expression, activeVariable: 'x', variables: independentY ? [variableSpec('x'), variableSpec('y')] : [variableSpec('x')], rules: independentY ? ['constant-multiple', 'power'] : ['product', 'power'], hints: [independentY ? 'One factor is frozen with respect to x.' : 'Both factors change with x.', 'Dependency decides how many product-rule contributions survive.', 'Apply local derivatives, then simplify.'], explanation: [independentY ? 'The frozen factor has derivative zero.' : 'Both product factors contribute.', 'Use dependency structure before applying the rule.'], difficulty: 'generated' });
}

function generateNested(level, seed, rng) {
  const mode = rng.int(0, 2);
  let expression;
  if (mode === 0) expression = power(sum(v('x'), v('y')), rng.int(2, 4));
  else if (mode === 1) expression = fn('sin', product(v('x'), v('y')));
  else expression = power(sum(power(v('x'), 2), v('y')), 3);
  return makeRound({ id: id(level, seed, 'nested'), level, title: 'Nested dependency tunnel', expression, activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')], rules: ['chain', 'power', 'constant-multiple'], hints: ['Name the inner expression.', 'Differentiate the outer function first.', 'Multiply by the inner partial derivative.'], explanation: ['A nested expression creates a dependency path through an intermediate value.', 'Multiply local derivatives along that path.', 'Frozen variables can remain inside the outer expression.'], difficulty: 'generated' });
}

function generateDeclaredDependency(level, seed, rng) {
  const dependent = dv('y', ['x']);
  const expression = rng.bool() ? product(power(v('x'), 2), dependent) : sum(product(v('x'), dependent), dependent);
  return makeRound({ id: id(level, seed, 'declared'), level, title: 'Declared y(x) dependency', expression, activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y', 'dependent')], derivativeType: 'total', displayDefinitions: ['y=y(x)'], context: { dependencies: { y: ['x'] } }, rules: ['product', 'sum'], hints: ['This is not the independent-input case.', 'y changes because x changes.', 'Include each direct and indirect contribution.'], explanation: ['The declaration y=y(x) creates a dependency wire.', 'The total derivative includes dy/dx terms.', 'Do not freeze y as an independent input.'], difficulty: 'generated' });
}

function generatePaths(level, seed, rng) {
  const p = rng.int(2, 4);
  const k = rng.nonZeroInt(2, 5);
  const expression = sum(power(v('x'), p), product(c(k), v('x')));
  return makeRound({ id: id(level, seed, 'paths'), level, title: 'Two-route computation graph', expression, activeVariable: 'x', variables: [variableSpec('x')], derivativeType: 'total', displayDefinitions: [`u=x^${p}`, `v=${k}x`, 'f=u+v'], graph: { nodes: ['x', 'u', 'v', 'f'], edges: [{ from: 'x', to: 'u', label: `${p}x^${p - 1}` }, { from: 'u', to: 'f', label: '1' }, { from: 'x', to: 'v', label: String(k) }, { from: 'v', to: 'f', label: '1' }] }, rules: ['path-sum', 'power', 'constant-multiple'], hints: ['Highlight both routes from x to f.', 'Multiply local derivatives along each route.', 'Add the route contributions.'], explanation: ['There are two alternative dependency paths.', 'Each path creates one derivative contribution.', 'The contributions add.'], difficulty: 'generated' });
}

function generateGradient(seed, rng) {
  const p = rng.int(2, 3);
  const coefficient = rng.nonZeroInt(2, 4);
  const expression = sum(power(v('x'), p), product(c(coefficient), v('x'), v('y')));
  const xDerivative = makeRound({ id: 'tmp-x', level: 9, title: '', expression, activeVariable: 'x', variables: [variableSpec('x'), variableSpec('y')] }).expectedAnswer.derivativeAst;
  const yDerivative = makeRound({ id: 'tmp-y', level: 9, title: '', expression, activeVariable: 'y', variables: [variableSpec('x'), variableSpec('y')] }).expectedAnswer.derivativeAst;
  return {
    id: id(9, seed, 'gradient'), seed, level: 9, title: 'Assemble a gradient row', taskKind: 'gradient', difficulty: 'generated', outputName: 'f', expression,
    variables: [variableSpec('x'), variableSpec('y')], activeVariable: 'x', derivativeType: 'partial', displayDefinitions: [],
    derivativeRequest: { type: 'gradient', numerator: 'f', denominator: 'x-vector', latex: '\\frac{\\partial f}{\\partial\\mathbf{x}}' },
    expectedAnswer: { shape: { rows: 1, columns: 2, semanticType: 'row-vector' }, componentOrder: ['x', 'y'], components: [xDerivative, yDerivative], canonicalLatex: '', canonicalPlain: '' },
    rules: ['sum', 'power', 'constant-multiple'], hints: ['Differentiate once with x active and once with y active.', 'Place components in [x,y] order.', 'The scalar output gives one row.'], explanation: ['Each partial derivative fills one gradient component.', 'Numerator layout uses a row for a scalar output.'], connection: 'This is one row of a Jacobian.', metadata: {}
  };
}

function generateNeuron(seed, rng) {
  const active = rng.pick(['w1', 'w2', 'x1', 'x2', 'b']);
  return makeRound({ id: id(10, seed, 'neuron'), level: 10, title: 'Affine neuron local derivative', outputName: 'z', expression: sum(product(v('w1'), v('x1')), product(v('w2'), v('x2')), v('b')), activeVariable: active, variables: ['w1', 'w2', 'x1', 'x2', 'b'].map(variableSpec), rules: ['sum', 'constant-multiple', 'identity', 'constant'], hints: [`Only ${active} is active.`, 'The partner in its product remains as a frozen multiplier.', 'Unrelated neuron terms contribute zero.'], explanation: ['This is a local derivative inside a neural-network computation.', 'Backpropagation later combines it with an incoming gradient.'], connection: 'Local derivatives are the reusable pieces of backpropagation.', difficulty: 'generated' });
}

function generateBugHunter(seed, rng) {
  const base = generateFrozenMultiplier(11, seed, rng);
  const active = base.activeVariable;
  const other = active === 'x' ? 'y' : 'x';
  return {
    ...base,
    id: id(11, seed, 'bug'),
    title: 'Bug Hunter: disappearing frozen factor',
    taskKind: 'bug-hunter',
    incorrectSteps: [`${other} is held fixed.`, `Differentiate only the ${active} factor and remove ${other}.`, `The result no longer contains ${other}.`],
    firstIncorrectIndex: 1,
    explanation: ['The first line is mathematically sound.', `The next line incorrectly deletes ${other}.`, 'A frozen multiplier remains unchanged in the result.']
  };
}

export function generateBatch(level, count, seed = 1, weakness = null) {
  const rounds = [];
  for (let i = 0; i < count; i += 1) rounds.push(generateQuestion(level, seed + i * 7919, weakness));
  return rounds;
}
