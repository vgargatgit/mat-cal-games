import { findAllPaths } from './computation-graph.js';
import { validateChainShapes, multiplyMatrices } from './shape-model.js';

export function edgeKey(from, to) { return `${from}->${to}`; }

export function multiplyPathDerivatives(path, localDerivativeMap) {
  const factors = [];
  for (let index = path.length - 1; index > 0; index -= 1) {
    const key = edgeKey(path[index - 1], path[index]);
    const derivative = localDerivativeMap[key];
    if (!derivative) throw new Error(`Missing local derivative for ${key}.`);
    factors.push(derivative);
  }
  const shapeResult = validateChainShapes(factors.map(factor => factor.shape));
  if (!shapeResult.valid) throw new Error(shapeResult.reason);
  let value = null;
  if (factors.every(factor => typeof factor.value === 'number')) value = factors.reduce((product, factor) => product * factor.value, 1);
  if (factors.every(factor => Array.isArray(factor.value))) value = factors.slice(1).reduce((product, factor) => multiplyMatrices(product, factor.value), factors[0].value);
  return { path: [...path], factors, expression: factors.map(factor => factor.expression).join(' · '), value, shape: shapeResult.shape };
}

export function accumulatePathContributions(contributions) {
  if (!contributions.length) throw new Error('No path contributions to accumulate.');
  const firstShape = contributions[0].shape;
  if (contributions.some(item => item.shape.rows !== firstShape.rows || item.shape.columns !== firstShape.columns)) throw new Error('Path contribution shapes do not match.');
  const numeric = contributions.every(item => typeof item.value === 'number');
  return {
    contributions: contributions.map(item => ({ ...item })),
    expression: contributions.map(item => `(${item.expression})`).join(' + '),
    value: numeric ? contributions.reduce((sum, item) => sum + item.value, 0) : null,
    shape: { ...firstShape }
  };
}

export function deriveAcrossGraph(graph, startId, endId, localDerivativeMap) {
  const paths = findAllPaths(graph, startId, endId);
  if (!paths.length) throw new Error(`No dependency path from ${startId} to ${endId}.`);
  return accumulatePathContributions(paths.map(path => multiplyPathDerivatives(path, localDerivativeMap)));
}
