import { SeededRandom } from './seeded-random.js';
import { classifyShape, derivativeShape, multiplyShapes, shape, transposeShape, formatShape } from './shape-math.js';

const SAMPLE_ROUNDS = {
  1: [
    objectQuestion('sample-object-column', 1, '\\mathbf{x}=\\begin{bmatrix}x_1\\\\x_2\\\\x_3\\end{bmatrix}', shape(3, 1), 'This object has three rows and one column.'),
    objectQuestion('sample-object-row', 1, '\\mathbf{x}^{T}=\\begin{bmatrix}x_1&x_2&x_3\\end{bmatrix}', shape(1, 3), 'Transpose turns the three-component column vector into one row.'),
    objectQuestion('sample-object-matrix', 1, 'A\\in\\mathbb{R}^{2\\times4}', shape(2, 4), 'The first dimension counts rows; the second counts columns.')
  ],
  2: [
    derivativeQuestion({
      id: 'sample-scalar-derivative', level: 2, inputCount: 1, outputCount: 1,
      contextLatex: 'f(x)=x^2', derivativeLatex: '\\frac{df}{dx}',
      explanation: 'The function produces one scalar and receives one scalar, so the derivative is scalar.'
    }),
    derivativeQuestion({
      id: 'sample-loss-bias', level: 2, inputCount: 1, outputCount: 1,
      contextLatex: 'L=(b-y)^2,\\quad b\\in\\mathbb{R}', derivativeLatex: '\\frac{\\partial L}{\\partial b}',
      explanation: 'Both the loss and bias are scalar, so the derivative is scalar.'
    })
  ],
  3: [
    derivativeQuestion({
      id: 'sample-vector-scalar', level: 3, inputCount: 3, outputCount: 1,
      contextLatex: 'f(\\mathbf{x})=x_1^2+x_2^2+x_3^2', derivativeLatex: '\\frac{\\partial f}{\\partial \\mathbf{x}}',
      explanation: 'One scalar output creates one row. Three input components create three columns.',
      revealLatex: '\\frac{\\partial f}{\\partial \\mathbf{x}}=\\begin{bmatrix}2x_1&2x_2&2x_3\\end{bmatrix}'
    }),
    derivativeQuestion({
      id: 'sample-gradient-4', level: 3, inputCount: 4, outputCount: 1,
      contextLatex: 'L:\\mathbb{R}^{4}\\to\\mathbb{R}', derivativeLatex: '\\frac{\\partial L}{\\partial \\mathbf{w}}',
      explanation: 'The scalar loss gives one output row; the four weights give four input columns.'
    })
  ],
  4: [
    derivativeQuestion({
      id: 'sample-scalar-vector', level: 4, inputCount: 1, outputCount: 3,
      contextLatex: '\\mathbf{f}(t)=\\begin{bmatrix}t\\\\t^2\\\\t^3\\end{bmatrix}', derivativeLatex: '\\frac{\\partial \\mathbf{f}}{\\partial t}',
      explanation: 'There are three outputs and one scalar input, so the derivative has three rows and one column.'
    }),
    derivativeQuestion({
      id: 'sample-broadcast-bias', level: 4, inputCount: 1, outputCount: 4,
      contextLatex: '\\mathbf{y}=\\mathbf{x}+b,\\quad \\mathbf{y}\\in\\mathbb{R}^{4}', derivativeLatex: '\\frac{\\partial \\mathbf{y}}{\\partial b}',
      explanation: 'The scalar bias influences each of the four output components, producing a 4 × 1 derivative.'
    })
  ],
  5: [
    derivativeQuestion({
      id: 'sample-jacobian-2x4', level: 5, inputCount: 4, outputCount: 2,
      contextLatex: '\\mathbf{f}:\\mathbb{R}^{4}\\to\\mathbb{R}^{2}', derivativeLatex: '\\frac{\\partial \\mathbf{f}}{\\partial \\mathbf{x}}',
      explanation: 'Two outputs create two rows; four inputs create four columns.'
    }),
    derivativeQuestion({
      id: 'sample-jacobian-5x2', level: 5, inputCount: 2, outputCount: 5,
      contextLatex: '\\mathbf{g}:\\mathbb{R}^{2}\\to\\mathbb{R}^{5}', derivativeLatex: '\\frac{\\partial \\mathbf{g}}{\\partial \\mathbf{x}}',
      explanation: 'Five output components create five rows; two input components create two columns.'
    })
  ],
  6: [
    transposeQuestion('sample-transpose-column', 6, shape(4, 1), '\\mathbf{x}\\in\\mathbb{R}^{4\\times1}', '\\mathbf{x}^{T}'),
    transposeQuestion('sample-transpose-gradient', 6, shape(1, 3), '\\frac{\\partial L}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{1\\times3}', '\\left(\\frac{\\partial L}{\\partial\\mathbf{x}}\\right)^T')
  ],
  7: [
    multiplyQuestion('sample-chain-2x4', 7, shape(2, 3), shape(3, 4), true),
    multiplyQuestion('sample-chain-invalid', 7, shape(2, 3), shape(4, 5), false)
  ],
  8: [
    derivativeQuestion({
      id: 'sample-neuron-weight', level: 8, inputCount: 3, outputCount: 1,
      contextLatex: 'z=\\mathbf{w}^{T}\\mathbf{x}+b,\\quad \\mathbf{w}\\in\\mathbb{R}^{3}', derivativeLatex: '\\frac{\\partial z}{\\partial \\mathbf{w}}',
      explanation: 'The neuron pre-activation is scalar and the weight vector has three components.'
    }),
    derivativeQuestion({
      id: 'sample-batch-jacobian', level: 8, inputCount: 3, outputCount: 5,
      contextLatex: '\\hat{\\mathbf{y}}\\in\\mathbb{R}^{5},\\quad \\mathbf{w}\\in\\mathbb{R}^{3}', derivativeLatex: '\\frac{\\partial \\hat{\\mathbf{y}}}{\\partial \\mathbf{w}}',
      explanation: 'One row per prediction and one column per weight gives a 5 × 3 Jacobian.'
    })
  ],
  9: [
    bugQuestion('sample-bug-reversed', 9, 3, 2, { rows: 3, columns: 2 }, 'The proposed Jacobian reversed inputs and outputs.'),
    bugQuestion('sample-bug-gradient', 9, 4, 1, { rows: 4, columns: 1 }, 'The proposed answer uses a column gradient instead of numerator-layout orientation.')
  ]
};

function baseQuestion({ id, level, kind, prompt, contextLatex, derivativeLatex, expected, concepts, hints, explanation, revealLatex = null, metadata = {} }) {
  return {
    id, level, kind, prompt, contextLatex, derivativeLatex, expected,
    concepts, hints, explanation, revealLatex, metadata,
    reasons: [
      { id: 'output-rows', text: 'Outputs determine rows.' },
      { id: 'input-columns', text: 'Inputs determine columns.' },
      { id: 'input-orientation', text: 'The input’s displayed orientation decides the derivative orientation.' },
      { id: 'inner-dimensions', text: 'Chain multiplication checks matching inner dimensions.' }
    ]
  };
}

function objectQuestion(id, level, latex, expected, explanation) {
  return baseQuestion({
    id, level, kind: 'shape', prompt: 'Classify this mathematical object.', contextLatex: latex,
    derivativeLatex: latex, expected, concepts: ['object-recognition'],
    hints: ['Count rows and columns.', 'A single row is a row vector; a single column is a column vector.', `The object has shape ${formatShape(expected)}.`],
    explanation, metadata: { reasonIds: [] }
  });
}

function derivativeQuestion({ id, level, inputCount, outputCount, contextLatex, derivativeLatex, explanation, revealLatex = null }) {
  const expected = derivativeShape(outputCount, inputCount);
  const reasonIds = inputCount === 1 && outputCount === 1 ? [] : ['output-rows', 'input-columns'];
  return baseQuestion({
    id, level, kind: 'shape', prompt: 'Predict the derivative shape before doing any calculus.', contextLatex, derivativeLatex, expected,
    concepts: derivativeConcepts(inputCount, outputCount),
    hints: [
      'Count the output components first.',
      `The output contributes ${outputCount} row${outputCount === 1 ? '' : 's'}. Now count the input components.`,
      `There are ${outputCount} output component${outputCount === 1 ? '' : 's'} and ${inputCount} input component${inputCount === 1 ? '' : 's'}.`
    ],
    explanation, revealLatex,
    metadata: { inputCount, outputCount, reasonIds }
  });
}

function transposeQuestion(id, level, original, contextLatex, derivativeLatex) {
  const expected = transposeShape(original);
  return baseQuestion({
    id, level, kind: 'transpose', prompt: 'Transpose the object and classify the result.', contextLatex, derivativeLatex, expected,
    concepts: ['transpose', 'orientation'],
    hints: ['Transpose swaps rows and columns.', `The original shape is ${formatShape(original)}.`, `Swap ${original.rows} and ${original.columns}.`],
    explanation: `Transpose swaps the dimensions: ${formatShape(original)} becomes ${formatShape(expected)}.`,
    metadata: { original, reasonIds: [] }
  });
}

function multiplyQuestion(id, level, left, right, valid = true) {
  const actualValid = left.columns === right.rows;
  if (valid !== actualValid) throw new Error('Sample multiplication validity mismatch');
  const expected = valid ? multiplyShapes(left, right) : shape(1, 1);
  return baseQuestion({
    id, level, kind: valid ? 'multiply' : 'validity',
    prompt: valid ? 'Join the Jacobian blocks and predict the result shape.' : 'Can these blocks multiply in this order?',
    contextLatex: `A\\in\\mathbb{R}^{${left.rows}\\times${left.columns}},\\quad B\\in\\mathbb{R}^{${right.rows}\\times${right.columns}}`,
    derivativeLatex: 'AB', expected,
    concepts: ['chain-compatibility', 'chain-order'],
    hints: valid
      ? ['Check the inner dimensions.', `${left.columns} and ${right.rows} must match.`, `Keep the outer dimensions ${left.rows} and ${right.columns}.`]
      : ['Check the inner dimensions.', `Compare ${left.columns} with ${right.rows}.`, 'Choose “Not valid” because the inner dimensions do not match.'],
    explanation: valid
      ? `The inner dimensions match: (${formatShape(left)})(${formatShape(right)}) gives ${formatShape(expected)}.`
      : `The inner dimensions are ${left.columns} and ${right.rows}; they do not match, so the product is invalid.`,
    metadata: { left, right, valid, reasonIds: ['inner-dimensions'] }
  });
}

function bugQuestion(id, level, inputCount, outputCount, proposed, explanation) {
  const expected = derivativeShape(outputCount, inputCount);
  return baseQuestion({
    id, level, kind: 'bug', prompt: 'The proposed derivative shape is wrong. Repair it.',
    contextLatex: `\\mathbf{f}:\\mathbb{R}^{${inputCount}}\\to\\mathbb{R}^{${outputCount}}`,
    derivativeLatex: `\\text{Proposed: }\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{${proposed.rows}\\times${proposed.columns}}`,
    expected, concepts: ['diagnosis', 'jacobian-order'],
    hints: ['Ignore the proposed answer and count outputs.', 'Outputs determine rows; inputs determine columns.', `Use ${outputCount} rows and ${inputCount} columns.`],
    explanation: `${explanation} The correct derivative shape is ${formatShape(expected)}.`,
    metadata: { inputCount, outputCount, proposed, reasonIds: ['output-rows', 'input-columns'] }
  });
}

function derivativeConcepts(inputCount, outputCount) {
  if (inputCount === 1 && outputCount === 1) return ['scalar-derivative'];
  if (inputCount > 1 && outputCount === 1) return ['vector-to-scalar', 'gradient-orientation'];
  if (inputCount === 1 && outputCount > 1) return ['scalar-to-vector'];
  return ['vector-to-vector', 'jacobian-order'];
}

function generatedObject(rng, level, index) {
  const kind = rng.pick(['scalar', 'row-vector', 'column-vector', 'matrix']);
  let expected;
  if (kind === 'scalar') expected = shape(1, 1);
  else if (kind === 'row-vector') expected = shape(1, rng.int(2, 6));
  else if (kind === 'column-vector') expected = shape(rng.int(2, 6), 1);
  else expected = shape(rng.int(2, 5), rng.int(2, 5));
  const latex = expected.semanticType === 'scalar'
    ? 's\\in\\mathbb{R}'
    : `A\\in\\mathbb{R}^{${expected.rows}\\times${expected.columns}}`;
  return objectQuestion(`generated-${level}-${index}-${rng.state}`, level, latex, expected, `The displayed dimensions are ${formatShape(expected)}, which is a ${labelCategory(expected.semanticType)}.`);
}

const SCALAR_DERIVATIVE_TEMPLATES = [
  { contextLatex: 'g(t)=\\sin(t)', derivativeLatex: '\\frac{dg}{dt}' },
  { contextLatex: 'T(c)=2c+5', derivativeLatex: '\\frac{dT}{dc}' },
  { contextLatex: 'E(r)=r^3', derivativeLatex: '\\frac{dE}{dr}' },
  { contextLatex: 'p(z)=e^z', derivativeLatex: '\\frac{dp}{dz}' }
];

function generatedDerivative(rng, level, index, mode, misconceptions = {}) {
  if (mode === 'scalar') {
    const template = SCALAR_DERIVATIVE_TEMPLATES[index % SCALAR_DERIVATIVE_TEMPLATES.length];
    return derivativeQuestion({
      id: 'generated-' + level + '-' + index + '-' + rng.state,
      level,
      inputCount: 1,
      outputCount: 1,
      ...template,
      explanation: 'The function has one scalar output and one scalar input, so its derivative is scalar.'
    });
  }

  let inputCount = 1;
  let outputCount = 1;
  if (mode === 'vector-to-scalar') inputCount = rng.int(2, 6);
  if (mode === 'scalar-to-vector') outputCount = rng.int(2, 6);
  if (mode === 'vector-to-vector') {
    inputCount = rng.int(2, 6);
    outputCount = rng.int(2, 6);
    if ((misconceptions['reversed-jacobian'] ?? 0) > 1 && inputCount === outputCount) outputCount = outputCount === 6 ? 5 : outputCount + 1;
  }
  const boldOutput = outputCount > 1 ? '\\mathbf{f}' : 'f';
  const boldInput = inputCount > 1 ? '\\mathbf{x}' : 'x';
  const contextLatex = outputCount > 1
    ? `${boldOutput}:\\mathbb{R}^{${inputCount}}\\to\\mathbb{R}^{${outputCount}}`
    : `${boldOutput}:\\mathbb{R}^{${inputCount}}\\to\\mathbb{R}`;
  const derivativeLatex = `\\frac{\\partial ${boldOutput}}{\\partial ${boldInput}}`;
  return derivativeQuestion({
    id: `generated-${level}-${index}-${rng.state}`, level, inputCount, outputCount, contextLatex, derivativeLatex,
    explanation: `${outputCount} output component${outputCount === 1 ? '' : 's'} create ${outputCount} row${outputCount === 1 ? '' : 's'}; ${inputCount} input component${inputCount === 1 ? '' : 's'} create ${inputCount} column${inputCount === 1 ? '' : 's'}.`
  });
}

function generatedTranspose(rng, level, index) {
  const original = rng.pick([shape(rng.int(2, 6), 1), shape(1, rng.int(2, 6)), shape(rng.int(2, 5), rng.int(2, 5))]);
  return transposeQuestion(`generated-${level}-${index}-${rng.state}`, level, original, `A\\in\\mathbb{R}^{${original.rows}\\times${original.columns}}`, 'A^{T}');
}

function generatedMultiply(rng, level, index, forceValid = null) {
  const valid = forceValid ?? rng.next() > .25;
  const a = rng.int(1, 5);
  const b = rng.int(2, 5);
  const c = rng.int(1, 5);
  const left = shape(a, b);
  const right = valid ? shape(b, c) : shape(b === 5 ? 4 : b + 1, c);
  return multiplyQuestion(`generated-${level}-${index}-${rng.state}`, level, left, right, valid);
}

function generatedNeural(rng, level, index) {
  const n = rng.int(2, 6);
  const family = rng.pick(['weight', 'bias', 'activation', 'loss-weight', 'batch']);
  if (family === 'bias') {
    return derivativeQuestion({ id: `generated-${level}-${index}-${rng.state}`, level, inputCount: 1, outputCount: 1, contextLatex: 'z=\\mathbf{w}^{T}\\mathbf{x}+b', derivativeLatex: '\\frac{\\partial z}{\\partial b}', explanation: 'Both the neuron pre-activation and bias are scalar.' });
  }
  if (family === 'activation') {
    return derivativeQuestion({ id: `generated-${level}-${index}-${rng.state}`, level, inputCount: 1, outputCount: 1, contextLatex: 'a=\\operatorname{ReLU}(z)', derivativeLatex: '\\frac{\\partial a}{\\partial z}', explanation: 'ReLU maps one scalar pre-activation to one scalar activation.' });
  }
  if (family === 'batch') {
    const m = rng.int(2, 6);
    return derivativeQuestion({ id: `generated-${level}-${index}-${rng.state}`, level, inputCount: n, outputCount: m, contextLatex: `\\hat{\\mathbf{y}}\\in\\mathbb{R}^{${m}},\\quad\\mathbf{w}\\in\\mathbb{R}^{${n}}`, derivativeLatex: '\\frac{\\partial\\hat{\\mathbf{y}}}{\\partial\\mathbf{w}}', explanation: `${m} predictions create rows and ${n} parameters create columns.` });
  }
  const numerator = family === 'weight' ? 'z' : 'L';
  return derivativeQuestion({ id: `generated-${level}-${index}-${rng.state}`, level, inputCount: n, outputCount: 1, contextLatex: `${numerator === 'z' ? 'z=\\mathbf{w}^{T}\\mathbf{x}+b' : 'L=(\\operatorname{ReLU}(\\mathbf{w}^{T}\\mathbf{x}+b)-y)^2'},\\quad\\mathbf{w}\\in\\mathbb{R}^{${n}}`, derivativeLatex: `\\frac{\\partial ${numerator}}{\\partial\\mathbf{w}}`, explanation: `The ${numerator === 'z' ? 'neuron pre-activation' : 'loss'} is scalar and the weight vector has ${n} components.` });
}

function generatedBug(rng, level, index) {
  const inputCount = rng.int(2, 6);
  let outputCount = rng.int(1, 6);
  if (outputCount === inputCount) outputCount = outputCount === 6 ? 5 : outputCount + 1;
  const expected = derivativeShape(outputCount, inputCount);
  const variants = [
    { rows: expected.columns, columns: expected.rows, explanation: 'The proposed answer reversed output rows and input columns.' },
    { rows: inputCount, columns: 1, explanation: 'The proposed answer copied the input’s column orientation instead of using numerator layout.' },
    { rows: 1, columns: 1, explanation: 'The proposed answer assumed every derivative is scalar.' }
  ];
  const proposed = rng.pick(variants);
  return bugQuestion(`generated-${level}-${index}-${rng.state}`, level, inputCount, outputCount, proposed, proposed.explanation);
}

function labelCategory(category) {
  return category.replace('-', ' ');
}

export function generateLevelQuestions(level, count, seed, learnerState = {}) {
  const rng = new SeededRandom(seed + level * 7919);
  const samples = SAMPLE_ROUNDS[level] ?? [];
  const questions = samples.slice(0, Math.min(samples.length, count));
  const misconceptions = learnerState.misconceptions ?? {};
  while (questions.length < count) {
    const index = questions.length;
    let q;
    switch (level) {
      case 1: q = generatedObject(rng, level, index); break;
      case 2: q = generatedDerivative(rng, level, index, 'scalar'); break;
      case 3: q = generatedDerivative(rng, level, index, 'vector-to-scalar'); break;
      case 4: q = generatedDerivative(rng, level, index, 'scalar-to-vector'); break;
      case 5: q = generatedDerivative(rng, level, index, 'vector-to-vector', misconceptions); break;
      case 6: q = generatedTranspose(rng, level, index); break;
      case 7: q = generatedMultiply(rng, level, index); break;
      case 8: q = generatedNeural(rng, level, index); break;
      case 9: q = generatedBug(rng, level, index); break;
      case 10: {
        const family = rng.int(1, 6);
        if (family === 1) q = generatedDerivative(rng, level, index, 'scalar');
        else if (family === 2) q = generatedDerivative(rng, level, index, 'vector-to-scalar');
        else if (family === 3) q = generatedDerivative(rng, level, index, 'scalar-to-vector');
        else if (family === 4) q = generatedDerivative(rng, level, index, 'vector-to-vector', misconceptions);
        else if (family === 5) q = generatedTranspose(rng, level, index);
        else q = generatedMultiply(rng, level, index, true);
        break;
      }
      default: throw new Error(`Unknown level ${level}`);
    }
    questions.push(q);
  }
  return questions;
}

export function validateQuestion(question) {
  if (!question?.id || !question.expected) return false;
  const { rows, columns, semanticType } = question.expected;
  return Number.isInteger(rows) && rows > 0 && Number.isInteger(columns) && columns > 0 && semanticType === classifyShape(rows, columns);
}
