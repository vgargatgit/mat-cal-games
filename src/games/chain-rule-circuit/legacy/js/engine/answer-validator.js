import { equivalentExpression, normalizeExpression } from '../math/expression-simplifier.js';
import { validateChainShapes, multiplyMatrices } from '../math/shape-model.js';
import { MISCONCEPTIONS } from '../data/misconceptions.js';
import { accumulationIsCorrect, connectionsAreCorrect, decompositionIsCorrect, incomingGradientIsCorrect, localDerivativesAreCorrect, pathProductsAreCorrect, pathsAreCorrect, roundIncludesStage } from './stage-validator.js';

function detectMisconception(round, answer) {
  const value = normalizeExpression(answer);
  if (value.includes('+') && round.expectedPaths?.length === 1) return 'added-serial';
  if (round.expectedPaths?.length > 1 && !value.includes('+')) return 'missing-path';
  if (round.incomingGradient && !value.includes('g')) return 'incoming-omitted';
  if (round.level === 11 && !value.includes('1')) return 'skip-omitted';
  if (round.level === 12 && value.split('+').length < 2) return 'product-path-omitted';
  return 'wrong-local';
}

export function validateFinalAnswer(round, answer) {
  if (round.taskType === 'shape') {
    const accepted = equivalentExpression(answer, round.accepted);
    const shapeResult = validateChainShapes(round.shapeBlocks);
    return {
      correct:accepted && shapeResult.valid,
      misconception:shapeResult.valid ? 'wrong-final-shape' : 'shape-mismatch'
    };
  }

  if (round.taskType === 'matrix') {
    const product = multiplyMatrices(round.matrices[0], round.matrices[1]);
    const flattened = product.map(row => row.join(',')).join(';');
    const correct = equivalentExpression(answer, [flattened, ...(round.accepted ?? [])]);
    return { correct, misconception:correct ? null : 'reversed-order' };
  }

  const correct = equivalentExpression(answer, round.accepted ?? [round.answer]);
  return { correct, misconception:correct ? null : detectMisconception(round, answer) };
}

function firstCircuitFault(round, checks, final) {
  if (checks.decomposition === false) return 'decomposition-mismatch';
  if (checks.graphConnections === false) return 'graph-connection';
  if (checks.localDerivatives === false) return 'wrong-local';
  if (checks.pathDetection === false) return 'missing-path';
  if (checks.pathMultiplication === false) return (round.expectedPaths?.length ?? 0) > 1 ? 'premature-addition' : 'factor-order';
  if (checks.accumulation === false) return 'accumulation-missing';
  if (checks.incomingGradient === false) return 'incoming-omitted';
  return final.misconception;
}

export function validateRound(round, submission) {
  const requiresPropagation = roundIncludesStage(round, 4);
  const final = requiresPropagation
    ? validateFinalAnswer(round, submission.finalAnswer ?? '')
    : { correct:true, misconception:null };
  const hasGraph = Boolean(round.graph);
  const allChecks = {
    decomposition:hasGraph ? decompositionIsCorrect(round, submission) : true,
    graphConnections:hasGraph ? connectionsAreCorrect(round, submission) : true,
    localDerivatives:hasGraph ? localDerivativesAreCorrect(round, submission) : true,
    pathDetection:hasGraph ? pathsAreCorrect(round, submission) : true,
    pathMultiplication:pathProductsAreCorrect(round, submission),
    accumulation:accumulationIsCorrect(round, submission),
    incomingGradient:incomingGradientIsCorrect(round, submission)
  };
  const checkStages = {
    decomposition:0,
    graphConnections:1,
    localDerivatives:2,
    pathDetection:3,
    pathMultiplication:4,
    accumulation:4,
    incomingGradient:4
  };
  const checks = Object.fromEntries(
    Object.entries(allChecks).filter(([key]) => roundIncludesStage(round, checkStages[key]))
  );

  const allStageScores = {
    decomposition:allChecks.decomposition ? 1 : .25,
    graphNodes:1,
    graphConnections:allChecks.graphConnections ? 1 : 0,
    forwardValues:hasGraph ? .7 : 1,
    localDerivatives:allChecks.localDerivatives ? 1 : 0,
    shapes:round.taskType === 'shape' ? (final.correct ? 1 : 0) : 1,
    pathDetection:allChecks.pathDetection ? 1 : 0,
    pathMultiplication:allChecks.pathMultiplication ? 1 : 0,
    accumulation:allChecks.accumulation ? 1 : 0,
    incomingGradient:allChecks.incomingGradient ? 1 : 0,
    finalDerivative:final.correct ? 1 : 0,
    explanation:submission.explanation?.trim() ? 1 : .5
  };
  const scoreStages = {
    decomposition:0,
    graphNodes:1,
    graphConnections:1,
    forwardValues:1,
    localDerivatives:2,
    pathDetection:3,
    shapes:4,
    pathMultiplication:4,
    accumulation:4,
    incomingGradient:4,
    finalDerivative:4,
    explanation:4
  };
  const stages = Object.fromEntries(
    Object.entries(allStageScores).filter(([key]) => roundIncludesStage(round, scoreStages[key]))
  );

  const allStructuralChecks = Object.values(checks).every(Boolean);
  const allCorrect = final.correct && allStructuralChecks;
  const misconception = allCorrect ? null : firstCircuitFault(round, checks, final);
  return {
    allCorrect,
    finalCorrect:requiresPropagation ? final.correct : null,
    pathsCorrect:checks.pathDetection ?? true,
    checks,
    stages,
    misconception,
    feedback:allCorrect
      ? (requiresPropagation ? 'Every required stage is connected correctly.' : 'Focused stage verified.')
      : MISCONCEPTIONS[misconception]
  };
}
