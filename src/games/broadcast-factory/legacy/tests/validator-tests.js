import { validateShapeAnswer, validateNumericMatrix, validateOperationChoice, validateBooleanMatrix } from '../js/engine/answer-validator.js';
import { generateRound } from '../js/engine/question-generator.js';

export async function registerValidatorTests(t) {
  await t.test('detects scalar output collapse', () => {
    const result = validateShapeAnswer({ rows: 1, columns: 1 }, { rows: 3, columns: 1, components: 3 }, 'output');
    t.equal(result.misconception, 'scalar-output-collapse');
  });
  await t.test('detects wrong scalar derivative orientation', () => {
    const result = validateShapeAnswer({ rows: 1, columns: 3 }, { rows: 3, columns: 1 }, 'derivative');
    t.equal(result.misconception, 'wrong-orientation');
  });
  await t.test('detects scalar derivative collapsed to scalar', () => {
    const result = validateShapeAnswer({ rows: 1, columns: 1 }, { rows: 3, columns: 1 }, 'derivative');
    t.equal(result.misconception, 'scalar-derivative-as-scalar');
  });
  await t.test('detects dot-product confusion', () => {
    const round = generateRound({ levelId: 7, seed: 77, forcedOperation: 'scalar-times-vector' });
    t.equal(validateOperationChoice('dot-product', round).misconception, 'dot-product-confusion');
  });
  await t.test('detects dense dependency assumption', () => {
    const expected = [[true,false],[false,true]];
    t.equal(validateBooleanMatrix([[true,true],[true,true]], expected).misconception, 'dense-broadcast-dependency');
  });
  await t.test('detects ones used for scalar scaling derivative', () => {
    const round = generateRound({ levelId: 7, seed: 91, forcedOperation: 'scalar-times-vector' });
    round.targetName = round.operands.find((item) => item.semanticType === 'scalar').name;
    round.target = round.operands.find((item) => item.semanticType === 'scalar');
    const rows = round.outputShape.components;
    const result = validateNumericMatrix(Array.from({ length: rows }, () => [1]), round.operands.find((item) => item.semanticType === 'column-vector').values.map((value) => [value]), round);
    t.equal(result.misconception, 'ones-for-scaling');
  });
  await t.test('detects missing scalar multiplier', () => {
    const round = generateRound({ levelId: 7, seed: 101, forcedOperation: 'scalar-times-vector' });
    const vector = round.operands.find((item) => item.semanticType === 'column-vector');
    const scalar = round.operands.find((item) => item.semanticType === 'scalar');
    if (scalar.value === 1) scalar.value = 2;
    round.targetName = vector.name;
    round.target = vector;
    const n = vector.values.length;
    const identity = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
    const expected = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? scalar.value : 0));
    t.equal(validateNumericMatrix(identity, expected, round).misconception, 'missing-scalar-multiplier');
  });
}
