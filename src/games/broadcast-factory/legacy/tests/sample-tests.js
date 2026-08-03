import { SAMPLE_ROUNDS } from '../js/data/sample-rounds.js';
import { hydrateSampleRound } from '../js/engine/question-generator.js';
import { createRoundForProgress } from '../js/engine/game-engine.js';
import { defaultGameState } from '../js/storage.js';

export async function registerSampleTests(t) {
  await t.test('all deterministic sample outputs and derivatives match', () => {
    SAMPLE_ROUNDS.forEach((sample, index) => {
      const round = hydrateSampleRound(sample, Math.min(18, index + 1));
      if (sample.expectedOutput !== undefined) t.deepEqual(round.output, sample.expectedOutput, `${sample.id} output`);
      if (sample.expectedDerivative !== undefined) t.deepEqual(round.derivative.matrix, sample.expectedDerivative, `${sample.id} derivative`);
    });
  });
  await t.test('sample schedule starts relevant levels with exact orders', () => {
    const game = defaultGameState().learner.games.broadcastFactory;
    t.equal(createRoundForProgress(game, 2).id, 'sample-01');
    t.equal(createRoundForProgress(game, 5).id, 'sample-02');
    game.progress.attemptsByLevel[5] = 1;
    t.equal(createRoundForProgress(game, 5).id, 'sample-03');
    t.equal(createRoundForProgress(game, 11).id, 'sample-13');
    t.equal(createRoundForProgress(game, 12).id, 'sample-14');
  });
}
