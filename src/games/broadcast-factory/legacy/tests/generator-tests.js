import { generateRound, generatorInvariant } from '../js/engine/question-generator.js';
import { numericalJacobian, matricesClose } from '../js/math/finite-difference.js';

export async function registerGeneratorTests(t, rounds = 2000) {
  await t.test(`generator invariants across ${rounds} rounds`, () => {
    for (let i = 0; i < rounds; i += 1) {
      const levelId = i % 18 + 1;
      const round = generateRound({ levelId, seed: 10000 + i, attempt: i % 4 });
      t.assert(generatorInvariant(round), `Invariant failed for ${round.id}`);
      if (round.operationType === 'elementwise-divide') t.assert(round.operands[1].values.every((value) => value !== 0), `Zero denominator in ${round.id}`);
      if (round.operation.family === 'elementwise') t.equal(round.operands[0].values.length, round.operands[1].values.length, `Mismatched vector lengths in ${round.id}`);
    }
  });
  await t.test('every supported operation family generates valid rounds', () => {
    const operations = ['vector-plus-scalar','scalar-plus-vector','vector-minus-scalar','scalar-minus-vector','scalar-times-vector','vector-times-scalar','vector-plus-vector','vector-minus-vector','elementwise-multiply','elementwise-divide','dot-product','sum-reduction','matrix-vector','shared-scale-shift','per-feature-scale-shift'];
    for (const operation of operations) {
      for (let i = 0; i < 100; i += 1) {
        const round = generateRound({ levelId: 18, seed: 900000 + i, attempt: i % 4, forcedOperation: operation });
        t.assert(generatorInvariant(round), `Invariant failed for ${operation}, seed ${round.seed}`);
      }
    }
  });
  await t.test('generated symbolic derivatives agree with finite differences', () => {
    const eligible = new Set(['vector-plus-scalar','scalar-plus-vector','vector-minus-scalar','scalar-minus-vector','scalar-times-vector','vector-times-scalar','vector-plus-vector','vector-minus-vector','elementwise-multiply','elementwise-divide','dot-product','sum-reduction','matrix-vector','shared-scale-shift','per-feature-scale-shift']);
    for (let i = 0; i < 180; i += 1) {
      const round = generateRound({ levelId: i % 18 + 1, seed: 70000 + i, attempt: i % 4 });
      if (!eligible.has(round.operationType)) continue;
      const numeric = numericalJacobian(round.operationType, round.operands, round.targetName);
      t.assert(matricesClose(numeric, round.derivative.matrix, 1e-4), `Finite difference mismatch for ${round.id}`);
    }
  });
}
