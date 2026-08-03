import assert from 'node:assert/strict';
import { LEVELS, PIECES } from '../js/levels.js';
import {
  createDiagonalMatrix,
  createIdentityMatrix,
  getJacobianShape,
  jacobianTransposeVectorProduct,
  matricesEqual,
  multiplyNumericMatrices,
  structureMatches,
  transpose,
  validateMatrixMultiplication
} from '../js/math.js';

assert.deepEqual(getJacobianShape([2], [3]), [2, 3]);
assert.deepEqual(getJacobianShape([], [4]), [1, 4]);
assert.deepEqual(createIdentityMatrix(3), [['1','0','0'],['0','1','0'],['0','0','1']]);
assert.deepEqual(createDiagonalMatrix(['a','b']), [['a','0'],['0','b']]);
assert.deepEqual(transpose([[1,2,3],[4,5,6]]), [[1,4],[2,5],[3,6]]);
assert.equal(validateMatrixMultiplication([4,3], [3,2]), true);
assert.equal(validateMatrixMultiplication([3,2], [4,3]), false);
assert.deepEqual(multiplyNumericMatrices([[1,2],[3,4]], [[5],[6]]), [[17],[39]]);
assert.deepEqual(jacobianTransposeVectorProduct([[1,2],[3,4]], [5,6]), [23,34]);
assert.equal(matricesEqual([['2*x1']], [['2x₁']]), true);

for (const level of LEVELS) {
  assert.ok(level.phases.length >= 2, `Level ${level.id} must have multiple phases`);
  assert.equal(level.entries.length, level.output.length, `Level ${level.id} row count`);
  assert.equal(level.dependencies.length, level.output.length, `Level ${level.id} dependency rows`);
  for (let row = 0; row < level.output.length; row += 1) {
    assert.equal(level.entries[row].length, level.input.length, `Level ${level.id} entry columns`);
    assert.equal(level.dependencies[row].length, level.input.length, `Level ${level.id} dependency columns`);
  }
  assert.ok(PIECES[level.structure], `Level ${level.id} has a known piece family`);
  const entryDependencies = level.entries.map(row => row.map(value => String(value) !== '0'));
  assert.equal(
    structureMatches(entryDependencies, level.dependencies),
    true,
    `Level ${level.id} dependencies match structural zeros`
  );
  if (level.phases.includes('chain')) {
    assert.equal(level.correctOrder.length, level.localJacobians.length, `Level ${level.id} chain length`);
    const byName = new Map(level.localJacobians.map(item => [item.name, item]));
    const ordered = level.correctOrder.map(name => byName.get(name));
    assert.ok(ordered.every(Boolean), `Level ${level.id} chain names exist`);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      assert.equal(
        validateMatrixMultiplication(ordered[index].shape, ordered[index + 1].shape),
        true,
        `Level ${level.id} chain shapes are compatible`
      );
    }
  }
}

console.log(`PASS: mathematical utilities and all ${LEVELS.length} level definitions validated`);
