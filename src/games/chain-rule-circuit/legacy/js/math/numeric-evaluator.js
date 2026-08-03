import { topologicalOrder, incomingEdges, nodeMap } from './computation-graph.js';
import { multiplyMatrices } from './shape-model.js';

const map2 = (a, b, fn) => a.map((value, index) => fn(value, b[index]));
const sigmoid = value => 1 / (1 + Math.exp(-value));

export function applyOperation(type, inputs, params = {}) {
  const [a, b] = inputs;
  const scalar = {
    add: () => a + b, subtract: () => a - b, multiply: () => a * b, divide: () => {
      if (Math.abs(b) < 1e-12) throw new RangeError('Unsafe denominator.'); return a / b;
    }, power: () => a ** params.exponent, square: () => a * a, exp: () => Math.exp(a), sin: () => Math.sin(a), cos: () => Math.cos(a), tanh: () => Math.tanh(a), sigmoid: () => sigmoid(a), relu: () => Math.max(0, a), identity: () => a,
    elementwiseAdd: () => map2(a, b, (x, y) => x + y), broadcastAdd: () => a.map(x => x + b), scalarMultiply: () => a.map(x => x * b), elementwiseMultiply: () => map2(a, b, (x, y) => x * y), elementwiseActivation: () => a.map(x => applyOperation(params.activation ?? 'tanh', [x])), dot: () => a.reduce((sum, x, index) => sum + x * b[index], 0), sum: () => a.reduce((sum, x) => sum + x, 0), mean: () => a.reduce((sum, x) => sum + x, 0) / a.length, affine: () => multiplyMatrices(params.matrix, a.map(x => [x])).map((row, index) => row[0] + (params.bias?.[index] ?? 0))
  };
  if (!scalar[type]) throw new Error(`Unsupported operation ${type}.`);
  return scalar[type]();
}

export function computeForwardPass(graph, inputs = {}) {
  const values = { ...inputs };
  const nodes = nodeMap(graph);
  topologicalOrder(graph).forEach(id => {
    const node = nodes.get(id);
    if (node.role === 'input' || Object.hasOwn(values, id)) return;
    const edges = incomingEdges(graph, id).sort((x, y) => (x.inputIndex ?? 0) - (y.inputIndex ?? 0));
    values[id] = applyOperation(node.operation.type, edges.map(edge => values[edge.from]), node.operation.params);
  });
  return values;
}

export function finiteDifference(fn, point, epsilon = 1e-5) {
  if (Array.isArray(point)) return point.map((_, index) => {
    const plus = [...point]; const minus = [...point]; plus[index] += epsilon; minus[index] -= epsilon;
    return (fn(plus) - fn(minus)) / (2 * epsilon);
  });
  return (fn(point + epsilon) - fn(point - epsilon)) / (2 * epsilon);
}
