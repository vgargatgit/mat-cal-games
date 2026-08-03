const close = (a, b, tolerance = 1e-8) => Number.isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tolerance;

export function validateOperationChoice(submitted, round) {
  if (submitted === round.operationType) return { correct: true, points: 15 };
  let misconception = null;
  if (submitted === 'dot-product' && ['scalar-times-vector','vector-times-scalar'].includes(round.operationType)) misconception = 'dot-product-confusion';
  if (submitted === 'matrix-vector' && round.operation.family === 'elementwise') misconception = 'matrix-confusion';
  return { correct: false, points: 0, misconception, message: 'Check operand types and whether the machine preserves lanes, pairs lanes, mixes lanes, or reduces them.' };
}

export function validateShapeAnswer(submitted, expected, kind = 'derivative') {
  const rows = Number(submitted.rows);
  const columns = Number(submitted.columns);
  if (rows === expected.rows && columns === expected.columns) return { correct: true, points: kind === 'output' ? 15 : 20 };
  let misconception = null;
  if (expected.rows > 1 && expected.columns === 1 && rows === 1 && columns === expected.rows) misconception = 'wrong-orientation';
  if (kind === 'output' && expected.components > 1 && rows === 1 && columns === 1) misconception = 'scalar-output-collapse';
  if (kind === 'derivative' && expected.rows > 1 && expected.columns === 1 && rows === 1 && columns === 1) misconception = 'scalar-derivative-as-scalar';
  return { correct: false, points: 0, misconception, message: `Expected ${expected.rows} output row${expected.rows === 1 ? '' : 's'} and ${expected.columns} input column${expected.columns === 1 ? '' : 's'}.` };
}

export function validateNumericOutput(submitted, expected) {
  const expectedValues = Array.isArray(expected) ? expected : [expected];
  const submittedValues = Array.isArray(submitted) ? submitted : [submitted];
  const cellCorrect = expectedValues.map((value, index) => close(submittedValues[index], value));
  return {
    correct: submittedValues.length === expectedValues.length && cellCorrect.every(Boolean),
    points: cellCorrect.filter(Boolean).length / expectedValues.length * 20,
    cellCorrect,
    message: 'Evaluate the operation one output lane at a time.'
  };
}

export function validateBooleanMatrix(submitted, expected) {
  let correctCells = 0;
  const total = expected.length * expected[0].length;
  for (let row = 0; row < expected.length; row += 1) {
    for (let column = 0; column < expected[row].length; column += 1) {
      if (Boolean(submitted[row]?.[column]) === Boolean(expected[row][column])) correctCells += 1;
    }
  }
  return {
    correct: correctCells === total,
    points: correctCells / total * 20,
    misconception: submitted.flat().every(Boolean) && !expected.flat().every(Boolean) ? 'dense-broadcast-dependency' : null,
    message: 'Trace whether changing this one input component can change this one output component.'
  };
}

export function validateNumericMatrix(submitted, expected, round) {
  const rows = expected.length;
  const columns = expected[0].length;
  let correctCells = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (close(submitted[row]?.[column], expected[row][column])) correctCells += 1;
    }
  }
  const flattened = submitted.flat().map(Number);
  let misconception = null;
  if (columns === 1 && rows > 1 && flattened.length === 1) misconception = 'scalar-derivative-as-scalar';
  if (round.operationType.includes('times') && round.target.semanticType === 'scalar' && flattened.length === rows && flattened.every((value) => close(value, 1))) misconception = 'ones-for-scaling';
  if (round.operationType.includes('times') && round.target.semanticType === 'column-vector') {
    const identityLike = submitted.every((matrixRow, i) => matrixRow.every((value, j) => close(value, i === j ? 1 : 0)));
    if (identityLike && !close(round.operands.find((item) => item.semanticType === 'scalar').value, 1)) misconception = 'missing-scalar-multiplier';
  }
  return {
    correct: correctCells === rows * columns,
    points: correctCells / (rows * columns) * 30,
    correctCells,
    totalCells: rows * columns,
    misconception,
    message: 'Differentiate one output component with respect to one input component for each cell.'
  };
}

export function validateStructureChoice(submitted, expectedClassifications) {
  const aliases = { identity: ['identity'], 'scaled-identity': ['scaled-identity'], diagonal: ['diagonal'], 'full-column': ['full-column'], dense: ['dense'], reduction: ['reduction','row-vector'] };
  const accepted = aliases[submitted] ?? [submitted];
  const correct = accepted.some((value) => expectedClassifications.includes(value));
  return { correct, points: correct ? 15 : 0, misconception: submitted === 'identity' && expectedClassifications.includes('diagonal') ? 'diagonal-is-identity' : null };
}

export function validateRepairChoice(submitted, round) {
  return { correct: submitted === round.repairScenario?.id, points: submitted === round.repairScenario?.id ? 20 : 0 };
}
