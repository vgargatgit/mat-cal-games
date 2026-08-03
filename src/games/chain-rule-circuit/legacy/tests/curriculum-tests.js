import { test, equal, ok } from './test-utils.js';
import { roundForLevel } from '../js/data/sample-rounds.js';
import { validateGraph } from '../js/math/computation-graph.js';

test('level 1 decomposition and graph describe the same expression', () => {
  const round = roundForLevel(1);
  equal(round.assignments, ['u=x+1', 'y=u^2']);
  equal(round.graph.nodes.map(node => node.label), ['x', 'u=x+1', 'y=u²']);
  equal(round.graph.edges.map(edge => edge.localDerivative.expression), ['1', '2u']);
});

test('mixed scalar-vector level uses the declared x to u to v to s graph', () => {
  const round = roundForLevel(21);
  equal(round.graph.nodes.map(node => node.id), ['x', 'u', 'v', 's']);
  equal(round.expectedPaths, [['x', 'u', 'v', 's']]);
  equal(round.graph.edges.map(edge => [edge.localDerivative.shape.rows, edge.localDerivative.shape.columns]), [[3, 4], [3, 3], [1, 3]]);
});

test('every deterministic graph round has valid derivative shapes and no cycles', () => {
  for (let level = 1; level <= 22; level += 1) {
    const round = roundForLevel(level);
    if (round.graph) ok(validateGraph(round.graph).valid, `level ${level} graph should validate`);
  }
});


test('negative ReLU round accepts only the blocked-gradient result', () => {
  const round = roundForLevel(18);
  equal(round.graph.nodes.find(node => node.id === 'z').label, 'z < 0');
  equal(round.expectedProduct, ['2(a-y)', '0']);
  equal(round.accepted, ['0']);
});
