import { normalizeExpression } from '../math/expression-simplifier.js';

export const edgeKey = edge => `${edge.from}->${edge.to}`;
export const pathKey = path => Array.isArray(path) ? path.join('>') : String(path);

export function roundStageRange(round) {
  const fallbackStart = round.graph ? 0 : 4;
  const start = Math.max(0, Math.min(4, round.stageStart ?? fallbackStart));
  const end = Math.max(start, Math.min(4, round.stageEnd ?? 4));
  return { start, end };
}

export function roundIncludesStage(round, stage) {
  const { start, end } = roundStageRange(round);
  return stage >= start && stage <= end;
}

function normalized(value) {
  return normalizeExpression(String(value ?? ''));
}

function sameOrderedValues(actual = [], expected = []) {
  if (actual.length !== expected.length) return false;
  return expected.every((item, index) => normalized(actual[index]) === normalized(item));
}

function sameUnorderedValues(actual = [], expected = []) {
  if (actual.length !== expected.length) return false;
  const left = actual.map(normalized).sort();
  const right = expected.map(normalized).sort();
  return right.every((item, index) => left[index] === item);
}

export function expectedConnections(round) {
  return (round.graph?.edges ?? []).map(edgeKey);
}

export function connectionsAreCorrect(round, submission = {}) {
  if (!round.graph) return true;
  return sameUnorderedValues(submission.connections ?? [], expectedConnections(round));
}

export function decompositionIsCorrect(round, submission = {}) {
  if (!round.graph) return true;
  return sameUnorderedValues(submission.assignments ?? [], round.assignments ?? []);
}

export function localDerivativesAreCorrect(round, submission = {}) {
  const edges = round.graph?.edges ?? [];
  if (!edges.length) return true;
  const map = submission.derivativeMap ?? {};
  if (Object.keys(map).length) {
    return edges.every(edge => normalized(map[edgeKey(edge)]) === normalized(edge.localDerivative.expression));
  }
  return sameUnorderedValues(submission.derivatives ?? [], edges.map(edge => edge.localDerivative.expression));
}

export function pathsAreCorrect(round, submission = {}) {
  const expected = (round.expectedPaths ?? []).map(pathKey);
  const actual = (submission.paths ?? []).map(pathKey);
  return sameUnorderedValues(actual, expected);
}

export function expectedSerialFactors(round) {
  const incoming = normalized(round.incomingGradient);
  return (round.expectedProduct ?? []).filter(factor => !incoming || normalized(factor) !== incoming);
}

export function pathProductsAreCorrect(round, submission = {}) {
  const paths = round.expectedPaths ?? [];
  const expected = round.expectedProduct ?? [];
  if (!round.graph || round.taskType === 'shape' || round.taskType === 'matrix') return true;
  if (paths.length > 1) {
    const products = submission.pathProducts ?? {};
    return paths.every((path, index) => normalized(products[pathKey(path)]) === normalized(expected[index]));
  }
  return sameOrderedValues(submission.factorOrder ?? [], expectedSerialFactors(round));
}

export function accumulationIsCorrect(round, submission = {}) {
  return (round.expectedPaths?.length ?? 0) > 1 ? submission.accumulated === true : true;
}

export function incomingGradientIsCorrect(round, submission = {}) {
  return round.incomingGradient ? submission.injectedGradient === true : true;
}

export function stageReadiness(round, submission = {}, stage = 0) {
  if (!round.graph && stage < 4) return { complete:true, progress:1, message:'This round begins at the derivative-block bench.' };

  if (stage === 0) {
    const expected = round.assignments?.length ?? 0;
    const selected = submission.assignments?.length ?? 0;
    const complete = decompositionIsCorrect(round, submission);
    return {
      complete,
      progress:expected ? Math.min(1, selected / expected) : 1,
      message:complete ? 'Expression split verified.' : `${selected} of ${expected} required assignments selected. Remove any tile that changes the expression.`
    };
  }

  if (stage === 1) {
    const expected = expectedConnections(round).length;
    const selected = submission.connections?.length ?? 0;
    const complete = connectionsAreCorrect(round, submission);
    return {
      complete,
      progress:expected ? Math.min(1, selected / expected) : 1,
      message:complete ? 'Forward topology verified.' : `${selected} of ${expected} dependency wires connected. Direction must run from input toward output.`
    };
  }

  if (stage === 2) {
    const expected = round.graph?.edges?.length ?? 0;
    const selected = Object.values(submission.derivativeMap ?? {}).filter(Boolean).length;
    const complete = localDerivativesAreCorrect(round, submission);
    return {
      complete,
      progress:expected ? Math.min(1, selected / expected) : 1,
      message:complete ? 'Every wire has the correct immediate derivative.' : `${selected} of ${expected} wire gains labelled. Each label must use the destination over the source.`
    };
  }

  if (stage === 3) {
    const expected = round.expectedPaths?.length ?? 0;
    const selected = submission.paths?.length ?? 0;
    const complete = pathsAreCorrect(round, submission);
    return {
      complete,
      progress:expected ? Math.min(1, selected / expected) : 1,
      message:complete ? 'All dependency routes traced.' : `${selected} of ${expected} routes selected. Include every path from the requested input to the output.`
    };
  }

  const checks = [
    pathProductsAreCorrect(round, submission),
    accumulationIsCorrect(round, submission),
    incomingGradientIsCorrect(round, submission),
    Boolean(String(submission.finalAnswer ?? '').trim())
  ];
  const completeCount = checks.filter(Boolean).length;
  return {
    complete:checks.every(Boolean),
    progress:completeCount / checks.length,
    message:checks.every(Boolean) ? 'Backward circuit is ready for diagnostics.' : `${completeCount} of ${checks.length} propagation checks ready.`
  };
}
