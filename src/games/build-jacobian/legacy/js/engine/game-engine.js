import { stagesForRound } from '../data/levels.js';
import { c, v, add, mul, simplify, stableKey, toLatex, toPlain } from '../math/ast.js';
import { equivalentExpressions, safeParse } from '../math/equivalence.js';
import { isZeroExpression } from '../math/jacobian.js';
import { SeededRandom } from './seeded-random.js';
import { scoreStage } from './scoring.js';

function matrix(rows, columns, valueFactory) {
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => valueFactory(row, column)));
}

function cloneMatrix(source) {
  return source.map(row => row.map(cell => cell ? JSON.parse(JSON.stringify(cell)) : null));
}

export class GameEngine {
  constructor(round, restored = null) {
    this.round = round;
    this.stages = stagesForRound(round);
    const rows = round.expectedShape.rows;
    const columns = round.expectedShape.columns;
    this.state = {
      stageIndex: 0,
      completedStages: [],
      shape: { rows: '', columns: '' },
      rowLabels: Array(rows).fill(''),
      columnLabels: Array(columns).fill(''),
      dependencies: matrix(rows, columns, () => false),
      submissions: matrix(rows, columns, () => null),
      cellStatus: matrix(rows, columns, () => 'empty'),
      selectedCell: null,
      selectedTile: null,
      classification: [],
      interpretation: { output: '', input: '', response: '' },
      score: 0,
      hintsUsed: {},
      attempts: {},
      feedback: null,
      streak: 0,
      ...restored,
    };
    if (!restored && round.mode === 'repair') this.prefillBug();
  }

  get currentStage() { return this.stages[this.state.stageIndex]; }
  get isComplete() { return this.currentStage === 'complete'; }

  recordAttempt(stage) {
    this.state.attempts[stage] = (this.state.attempts[stage] || 0) + 1;
  }

  useHint(stage = this.currentStage) {
    this.state.hintsUsed[stage] = (this.state.hintsUsed[stage] || 0) + 1;
  }

  completeStage(result) {
    const stage = this.currentStage;
    if (!this.state.completedStages.includes(stage)) this.state.completedStages.push(stage);
    this.state.score += scoreStage(stage, result, {
      attempts: this.state.attempts[stage] || 1,
      hints: this.state.hintsUsed[stage] || 0,
      streak: this.state.streak,
    });
    this.state.streak = result.ok ? this.state.streak + 1 : 0;
    this.state.feedback = result.feedback || null;
    this.state.stageIndex = Math.min(this.stages.length - 1, this.state.stageIndex + 1);
    return result;
  }

  validateShape(rows, columns) {
    this.recordAttempt('shape');
    const submittedRows = Number(rows);
    const submittedColumns = Number(columns);
    this.state.shape = { rows: submittedRows, columns: submittedColumns };
    const expected = this.round.expectedShape;
    if (submittedRows === expected.rows && submittedColumns === expected.columns) {
      return this.completeStage({ ok: true, feedback: { type: 'good', text: `${expected.rows} outputs define ${expected.rows} rows; ${expected.columns} inputs define ${expected.columns} columns.` } });
    }
    const reversed = submittedRows === expected.columns && submittedColumns === expected.rows && expected.rows !== expected.columns;
    const misconception = reversed ? 'reversed-dimensions' : 'shape-count';
    return { ok: false, misconception, feedback: { type: 'bad', text: reversed ? 'You reversed the dimensions. Under numerator layout, outputs are rows and inputs are columns.' : `Count outputs for rows and inputs for columns. The shape is ${expected.rows}×${expected.columns}.` } };
  }

  validateLabels(rowLabels, columnLabels) {
    this.recordAttempt('labels');
    this.state.rowLabels = [...rowLabels];
    this.state.columnLabels = [...columnLabels];
    const expectedRows = this.round.outputs.map(output => output.name);
    const expectedColumns = [...this.round.inputs];
    const rowsCorrect = expectedRows.every((name, index) => rowLabels[index] === name);
    const columnsCorrect = expectedColumns.every((name, index) => columnLabels[index] === name);
    if (rowsCorrect && columnsCorrect) {
      return this.completeStage({ ok: true, feedback: { type: 'good', text: 'Rows now name output components; columns now name input components.' } });
    }
    const reversed = rowLabels.some(label => expectedColumns.includes(label)) || columnLabels.some(label => expectedRows.includes(label));
    return { ok: false, misconception: reversed ? 'row-column-reversal' : 'label-order', feedback: { type: 'bad', text: reversed ? 'Output labels belong on rows and input labels belong on columns.' : 'Keep component order: row i is fᵢ and column j is xⱼ.' } };
  }

  validateLocatedCell(row, column) {
    this.recordAttempt('locate');
    const target = this.round.targetCell;
    if (row === target.row && column === target.column) {
      return this.completeStage({ ok: true, feedback: { type: 'good', text: `Correct: J${target.row + 1}${target.column + 1} is row ${target.row + 1}, column ${target.column + 1}.` } });
    }
    const swapped = row === target.column && column === target.row;
    return { ok: false, misconception: swapped ? 'row-column-reversal' : 'wrong-cell', feedback: { type: 'bad', text: `Read the row index first and column index second. Find row ${target.row + 1}, column ${target.column + 1}.` } };
  }

  validateDependencies(submitted) {
    this.recordAttempt('dependencies');
    this.state.dependencies = submitted.map(row => [...row]);
    const mismatches = [];
    this.round.dependencyMatrix.forEach((row, i) => row.forEach((expected, j) => {
      if (Boolean(submitted[i][j]) !== expected) mismatches.push({ row: i, column: j, expected });
    }));
    if (mismatches.length === 0) {
      return this.completeStage({ ok: true, feedback: { type: 'good', text: 'The wiring map now predicts every structurally possible nonzero cell.' } });
    }
    const first = mismatches[0];
    const evaluatedZero = Boolean(first.expected && this.round.point && isZeroExpression(this.round.expectedJacobian[first.row][first.column]));
    const text = evaluatedZero
      ? `A dependency path exists from ${this.round.inputs[first.column]} to ${this.round.outputs[first.row].name}. Its slope is zero at this point, but the path is still structural.`
      : first.expected
        ? `A path exists from ${this.round.inputs[first.column]} to ${this.round.outputs[first.row].name}; that cell is not structurally zero.`
        : `No path exists from ${this.round.inputs[first.column]} to ${this.round.outputs[first.row].name}; that cell is structurally zero.`;
    return { ok: false, misconception: evaluatedZero ? 'evaluated-zero' : first.expected ? 'false-zero' : 'missed-structural-zero', feedback: { type: 'bad', text } };
  }

  activeCells() {
    const cells = [];
    for (let row = 0; row < this.round.expectedShape.rows; row += 1) {
      for (let column = 0; column < this.round.expectedShape.columns; column += 1) {
        if (this.round.mode === 'row-only' && row !== this.round.targetRow) continue;
        if (this.round.mode === 'column-only' && column !== this.round.targetColumn) continue;
        cells.push({ row, column });
      }
    }
    return cells;
  }

  placeAst(row, column, ast) {
    if (!this.activeCells().some(cell => cell.row === row && cell.column === column)) return { ok: false, error: 'This cell is outside the current drill.' };
    this.state.submissions[row][column] = simplify(ast);
    this.state.cellStatus[row][column] = 'filled';
    return { ok: true };
  }

  placeText(row, column, text) {
    const parsed = safeParse(text);
    if (!parsed.ok) return parsed;
    return this.placeAst(row, column, parsed.ast);
  }

  clearCell(row, column) {
    this.state.submissions[row][column] = null;
    this.state.cellStatus[row][column] = 'empty';
  }

  validateMatrix() {
    this.recordAttempt('build');
    const active = this.activeCells();
    const missing = active.filter(({ row, column }) => !this.state.submissions[row][column]);
    if (missing.length) {
      const first = missing[0];
      return { ok: false, misconception: 'incomplete-matrix', feedback: { type: 'warning', text: `Complete row ${first.row + 1}, column ${first.column + 1} before validating.` } };
    }

    let correctCells = 0;
    const errors = [];
    for (const { row, column } of active) {
      const submitted = this.state.submissions[row][column];
      const expected = this.round.expectedJacobian[row][column];
      const comparison = equivalentExpressions(submitted, expected);
      if (comparison.equivalent) {
        correctCells += 1;
        this.state.cellStatus[row][column] = 'correct';
      } else {
        this.state.cellStatus[row][column] = 'incorrect';
        const elsewhere = this.findExpectedCell(submitted, row, column);
        errors.push({ row, column, elsewhere });
      }
    }

    if (errors.length === 0) {
      return this.completeStage({ ok: true, correctCells, feedback: { type: 'good', text: `All ${correctCells} active cells contain the correct partial derivative in the correct position.` } });
    }

    if (this.isSubmittedTranspose()) {
      return { ok: false, correctCells, misconception: 'transpose', feedback: { type: 'bad', text: 'Your matrix matches the transpose of the expected Jacobian. That is a common alternate convention, but this game uses numerator layout: output rows, input columns.' } };
    }

    const first = errors[0];
    if (first.elsewhere) {
      return { ok: false, correctCells, misconception: 'wrong-cell', feedback: { type: 'bad', text: `The derivative value in row ${first.row + 1}, column ${first.column + 1} belongs to row ${first.elsewhere.row + 1}, column ${first.elsewhere.column + 1}. The value is useful; its location is not.` } };
    }
    return { ok: false, correctCells, misconception: 'wrong-derivative', feedback: { type: 'bad', text: `Recalculate ∂${this.round.outputs[first.row].name}/∂${this.round.inputs[first.column]}. Hold every other independent input fixed.` } };
  }

  findExpectedCell(ast, excludedRow, excludedColumn) {
    for (const { row, column } of this.activeCells()) {
      if (row === excludedRow && column === excludedColumn) continue;
      if (equivalentExpressions(ast, this.round.expectedJacobian[row][column]).equivalent) return { row, column };
    }
    return null;
  }

  isSubmittedTranspose() {
    const { rows, columns } = this.round.expectedShape;
    if (rows !== columns) return false;
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < columns; j += 1) {
        const submitted = this.state.submissions[i][j];
        if (!submitted || !equivalentExpressions(submitted, this.round.expectedJacobian[j][i]).equivalent) return false;
      }
    }
    return true;
  }

  validateClassification(selected) {
    this.recordAttempt('classify');
    this.state.classification = [...selected];
    const expected = expectedClassifications(this.round.classification);
    const actual = new Set(selected);
    const missing = expected.filter(value => !actual.has(value));
    const extra = [...actual].filter(value => !expected.includes(value));
    if (missing.length === 0 && extra.length === 0) {
      return this.completeStage({ ok: true, feedback: { type: 'good', text: `Correct structure: ${expected.join(', ')}.` } });
    }
    if (actual.has('identity') && !this.round.classification.identity) {
      return { ok: false, misconception: 'square-means-identity', feedback: { type: 'bad', text: 'A square Jacobian is identity only when each output copies its corresponding input with slope one and no cross-dependencies.' } };
    }
    if (actual.has('diagonal') && !this.round.classification.diagonal) {
      return { ok: false, misconception: 'false-diagonal', feedback: { type: 'bad', text: 'A vector function is diagonal only when each output depends exclusively on its corresponding input.' } };
    }
    return { ok: false, misconception: 'classification', feedback: { type: 'bad', text: `Recheck zero patterns and dimensions. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.` } };
  }

  validateInterpretation(outputName, inputName, response) {
    this.recordAttempt('interpret');
    this.state.interpretation = { output: outputName, input: inputName, response };
    const outputValid = this.round.outputs.some(output => output.name === outputName);
    const inputValid = this.round.inputs.includes(inputName);
    const responseValid = response === 'output-responds-to-input';
    if (outputValid && inputValid && responseValid) {
      const row = this.round.outputs.findIndex(output => output.name === outputName);
      const column = this.round.inputs.indexOf(inputName);
      const derivative = toPlain(this.round.symbolicJacobian[row][column]);
      return this.completeStage({ ok: true, feedback: { type: 'good', text: `J${row + 1}${column + 1} asks how ${outputName} responds locally when ${inputName} changes. Its symbolic value is ${derivative}.` } });
    }
    return { ok: false, misconception: 'entry-interpretation', feedback: { type: 'bad', text: 'A Jacobian cell describes how the row output responds when the column input changes slightly.' } };
  }

  derivativeTiles() {
    const activeExpected = this.activeCells().map(({ row, column }) => this.round.expectedJacobian[row][column]);
    const distractors = [c(0), c(1), ...this.round.inputs.map(name => v(name))];
    if (this.round.inputs.length >= 2) distractors.push(add(v(this.round.inputs[0]), v(this.round.inputs[1])));
    if (this.round.inputs.length) distractors.push(mul(c(2), v(this.round.inputs[0])));
    const unique = new Map();
    [...activeExpected, ...distractors].forEach(ast => unique.set(stableKey(ast), simplify(ast)));
    const rng = new SeededRandom(this.round.seed || hashString(this.round.id));
    return rng.shuffle([...unique.values()]).map((ast, index) => ({ id: `tile-${index}-${stableKey(ast)}`, ast, latex: toLatex(ast) }));
  }

  prefillBug() {
    const expected = this.round.expectedJacobian;
    if (this.round.bugType === 'transpose' && expected.length === expected[0].length) {
      this.state.submissions = matrix(expected.length, expected[0].length, (row, column) => JSON.parse(JSON.stringify(expected[column][row])));
    } else if (this.round.bugType === 'wrong-cell' && expected.length >= 2 && expected[0].length >= 2) {
      this.state.submissions = cloneMatrix(expected);
      [this.state.submissions[0][1], this.state.submissions[1][0]] = [this.state.submissions[1][0], this.state.submissions[0][1]];
    } else {
      this.state.submissions = cloneMatrix(expected);
      const zeroCell = this.activeCells().find(({ row, column }) => isZeroExpression(expected[row][column]));
      if (zeroCell) this.state.submissions[zeroCell.row][zeroCell.column] = c(1);
    }
    this.state.cellStatus = this.state.submissions.map(row => row.map(cell => cell ? 'filled' : 'empty'));
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

function expectedClassifications(classification) {
  const values = [];
  values.push(classification.square ? 'square' : 'rectangular');
  if (classification.identity) values.push('identity');
  if (classification.diagonal && !classification.identity) values.push('diagonal');
  if (classification.sparse) values.push('sparse');
  if (classification.dense) values.push('dense');
  if (classification.constant) values.push('constant');
  if (classification.inputDependent) values.push('input-dependent');
  if (classification.zeroRows.length) values.push('zero-row');
  if (classification.zeroColumns.length) values.push('zero-column');
  return values;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function classificationOptions() {
  return [
    ['square', 'Square', 'same number of output rows and input columns'],
    ['rectangular', 'Rectangular', 'different output and input counts'],
    ['identity', 'Identity', 'ones on diagonal, zeros elsewhere'],
    ['diagonal', 'Diagonal', 'off-diagonal cells are zero'],
    ['sparse', 'Sparse', 'many structurally zero cells'],
    ['dense', 'Dense', 'every cell is structurally connected'],
    ['constant', 'Constant', 'derivative values do not depend on inputs'],
    ['input-dependent', 'Input-dependent', 'at least one derivative changes with inputs'],
    ['zero-row', 'Has zero row', 'a constant output gauge'],
    ['zero-column', 'Has zero column', 'an unused input knob'],
  ];
}
