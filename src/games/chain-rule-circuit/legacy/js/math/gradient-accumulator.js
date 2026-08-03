import { topologicalOrder, incomingEdges } from './computation-graph.js';

const add = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((value, index) => value + b[index]);
  return { type: 'sum', terms: [a, b] };
};
const multiply = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return a * b;
  return { type: 'product', factors: [a, b] };
};

export function initializeGradientStore(graph) {
  return Object.fromEntries(graph.nodes.map(node => [node.id, { incomingGradientContributions: [], accumulatedGradient: null, gradientShape: null }]));
}

export function propagateGradientBackward(graph, outputNodeId, seedGradient = 1, derivativeProvider = edge => edge.localDerivative?.value ?? edge.localDerivative?.expression) {
  const gradients = initializeGradientStore(graph);
  gradients[outputNodeId].incomingGradientContributions.push({ sourcePath: [outputNodeId], value: seedGradient });
  const order = topologicalOrder(graph).reverse();
  order.forEach(nodeId => {
    const ledger = gradients[nodeId].incomingGradientContributions;
    if (!ledger.length) return;
    const accumulated = ledger.map(item => item.value).reduce(add);
    gradients[nodeId].accumulatedGradient = accumulated;
    incomingEdges(graph, nodeId).forEach(edge => {
      const local = derivativeProvider(edge, graph);
      gradients[edge.from].incomingGradientContributions.push({ sourcePath: [outputNodeId, nodeId, edge.from], from: nodeId, value: multiply(accumulated, local), localDerivative: local });
    });
  });
  return gradients;
}
