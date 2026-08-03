import { classifyShape } from './shape-math.js';

export function validateSubmission(question, submission) {
  if (question.kind === 'validity') {
    const correct = submission.validity === false;
    return correct
      ? success(question)
      : failure('inner-dimension-mistake', 'The inner dimensions do not match, so this product is not valid.', question);
  }

  if (submission.validity === false && question.kind === 'multiply') {
    return failure('false-incompatibility', 'These blocks are compatible. Their inner dimensions match.', question);
  }

  const expected = question.expected;
  const categoryCorrect = submission.category === expected.semanticType;
  const dimensionsCorrect = Number(submission.rows) === expected.rows && Number(submission.columns) === expected.columns;
  const reasonIds = question.metadata?.reasonIds ?? [];
  const submittedReasons = submission.reasons ?? [];
  const reasonCorrect = reasonIds.length === 0 || (
    submittedReasons.length === reasonIds.length && reasonIds.every((id) => submittedReasons.includes(id))
  );

  if (categoryCorrect && dimensionsCorrect) {
    return success(question, { categoryCorrect, dimensionsCorrect, reasonCorrect });
  }

  const misconception = detectMisconception(question, submission);
  return failure(misconception.id, misconception.feedback, question, { categoryCorrect, dimensionsCorrect, reasonCorrect });
}

export function detectMisconception(question, submission) {
  const expected = question.expected;
  const rows = Number(submission.rows);
  const columns = Number(submission.columns);

  if (rows === expected.columns && columns === expected.rows && (expected.rows !== expected.columns)) {
    if (expected.rows === 1 || expected.columns === 1) {
      return { id: 'gradient-orientation', feedback: 'You transposed the expected derivative. Under numerator layout, outputs determine rows and inputs determine columns.' };
    }
    return { id: 'reversed-jacobian', feedback: 'You reversed input and output roles. Under numerator layout, outputs determine rows and inputs determine columns.' };
  }

  if (submission.category === 'scalar' && (expected.rows > 1 || expected.columns > 1)) {
    return { id: 'every-derivative-scalar', feedback: 'A derivative is scalar only when both the output and differentiation variable are scalar. Multiple components create rows or columns.' };
  }

  if (question.metadata?.inputCount === 1 && question.metadata?.outputCount > 1 && rows === 1 && columns === 1) {
    return { id: 'scalar-input-collapse', feedback: 'A scalar input creates one column, but every output component still contributes a row.' };
  }

  if (submission.category && submission.category !== classifyShape(expected.rows, expected.columns)) {
    if (expected.semanticType === 'row-vector' && submission.category === 'column-vector') {
      return { id: 'input-orientation-fallacy', feedback: 'The input being displayed vertically does not make the derivative a column vector. Numerator layout gives one row per output.' };
    }
    if (expected.semanticType === 'column-vector' && submission.category === 'row-vector') {
      return { id: 'scalar-output-input-confusion', feedback: 'There are multiple outputs and one scalar input, so the derivative has multiple rows and one column.' };
    }
    return { id: 'category-dimension-conflict', feedback: `The selected category does not match a ${expected.rows} × ${expected.columns} object.` };
  }

  const requiredReasons = question.metadata?.reasonIds ?? [];
  if (requiredReasons.length > 0 && !requiredReasons.every((id) => submission.reasons?.includes(id))) {
    return { id: 'reasoning-rule', feedback: 'Use the structural rule: outputs determine rows and inputs determine columns.' };
  }

  return { id: 'dimension-mismatch', feedback: `Recount the components. The expected result uses ${expected.rows} row${expected.rows === 1 ? '' : 's'} and ${expected.columns} column${expected.columns === 1 ? '' : 's'}.` };
}

function success(question, detail = {}) {
  return { correct: true, misconception: null, feedback: question.explanation, ...detail };
}

function failure(id, feedback, question, detail = {}) {
  return { correct: false, misconception: id, feedback, expected: question.expected, ...detail };
}
