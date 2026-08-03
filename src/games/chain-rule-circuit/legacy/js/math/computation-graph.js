import { sameShape } from './shape-model.js';

export function createGraph(nodes = [], edges = []) {
  return { nodes: nodes.map(node => ({ ...node })), edges: edges.map(edge => ({ ...edge })) };
}

export function nodeMap(graph) {
  return new Map(graph.nodes.map(node => [node.id, node]));
}

export function incomingEdges(graph, nodeId) {
  return graph.edges.filter(edge => edge.to === nodeId);
}

export function outgoingEdges(graph, nodeId) {
  return graph.edges.filter(edge => edge.from === nodeId);
}

export function topologicalOrder(graph) {
  const ids = new Set(graph.nodes.map(node => node.id));
  const indegree = new Map([...ids].map(id => [id, 0]));
  graph.edges.forEach(edge => {
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`Edge ${edge.from}→${edge.to} references an unknown node.`);
    indegree.set(edge.to, indegree.get(edge.to) + 1);
  });
  const queue = graph.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
  const order = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    order.push(id);
    outgoingEdges(graph, id).forEach(edge => {
      indegree.set(edge.to, indegree.get(edge.to) - 1);
      if (indegree.get(edge.to) === 0) queue.push(edge.to);
    });
  }
  if (order.length !== graph.nodes.length) throw new Error('Graph contains a cycle.');
  return order;
}

export function validateGraph(graph) {
  const errors = [];
  const ids = graph.nodes.map(node => node.id);
  if (new Set(ids).size !== ids.length) errors.push('Node IDs must be unique.');
  try { topologicalOrder(graph); } catch (error) { errors.push(error.message); }
  const nodes = nodeMap(graph);
  graph.edges.forEach(edge => {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) return;
    if (edge.localDerivative?.shape && from.shape && to.shape) {
      const expected = { rows: to.shape.semanticType === 'scalar' ? 1 : to.shape.rows * to.shape.columns, columns: from.shape.semanticType === 'scalar' ? 1 : from.shape.rows * from.shape.columns };
      if (!sameShape(edge.localDerivative.shape, expected)) errors.push(`Derivative shape on ${edge.from}→${edge.to} is invalid.`);
    }
  });
  return { valid: errors.length === 0, errors };
}

export function findAllPaths(graph, startId, endId) {
  const paths = [];
  const visit = (id, path) => {
    if (id === endId) { paths.push(path); return; }
    outgoingEdges(graph, id).forEach(edge => {
      if (!path.includes(edge.to)) visit(edge.to, [...path, edge.to]);
    });
  };
  if (nodeMap(graph).has(startId) && nodeMap(graph).has(endId)) visit(startId, [startId]);
  return paths;
}

export function describeGraph(graph) {
  const nodes = nodeMap(graph);
  return graph.nodes.map(node => {
    const uses = outgoingEdges(graph, node.id).map(edge => nodes.get(edge.to)?.label ?? edge.to);
    return uses.length ? `${node.label ?? node.id} feeds ${uses.join(' and ')}.` : `${node.label ?? node.id} is an output.`;
  }).join(' ');
}
