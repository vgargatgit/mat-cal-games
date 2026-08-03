import { collectDirectReferences } from './expression-model.js';

export function buildComputationGraph({ inputs, intermediates = [], outputs }) {
  const nodes = [];
  const edges = [];
  const known = new Set();
  inputs.forEach(input => { nodes.push({ id: input.name, kind: 'input', label: input.name }); known.add(input.name); });
  intermediates.forEach(item => { nodes.push({ id: item.name, kind: 'intermediate', label: item.name }); known.add(item.name); });
  outputs.forEach(output => { nodes.push({ id: output.name, kind: 'output', label: output.name }); known.add(output.name); });

  const addEdges = (target, expression) => {
    for (const source of collectDirectReferences(expression)) {
      if (!known.has(source)) throw new Error(`Undeclared graph reference ${source} → ${target}`);
      edges.push({ source, target });
    }
  };
  intermediates.forEach(item => addEdges(item.name, item.expressionAst));
  outputs.forEach(output => addEdges(output.name, output.expressionAst));

  const graph = { nodes, edges };
  const cycle = detectCycle(graph);
  if (cycle) throw new Error(`Computation graph contains a cycle: ${cycle.join(' → ')}`);
  return graph;
}

export function adjacencyMap(graph) {
  const map = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach(edge => map.get(edge.source)?.push(edge.target));
  return map;
}

export function reverseAdjacencyMap(graph) {
  const map = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach(edge => map.get(edge.target)?.push(edge.source));
  return map;
}

export function detectCycle(graph) {
  const adjacency = adjacencyMap(graph);
  const visiting = new Set();
  const visited = new Set();
  const path = [];
  const dfs = node => {
    if (visiting.has(node)) {
      const start = path.indexOf(node);
      return [...path.slice(start), node];
    }
    if (visited.has(node)) return null;
    visiting.add(node); path.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const cycle = dfs(next);
      if (cycle) return cycle;
    }
    path.pop(); visiting.delete(node); visited.add(node);
    return null;
  };
  for (const node of adjacency.keys()) {
    const cycle = dfs(node);
    if (cycle) return cycle;
  }
  return null;
}

export function topologicalOrder(graph) {
  const indegree = new Map(graph.nodes.map(node => [node.id, 0]));
  graph.edges.forEach(edge => indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1));
  const queue = [...indegree.entries()].filter(([,degree]) => degree === 0).map(([id]) => id);
  const result = [];
  const adjacency = adjacencyMap(graph);
  while (queue.length) {
    const node = queue.shift(); result.push(node);
    for (const next of adjacency.get(node) ?? []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (result.length !== graph.nodes.length) throw new Error('Graph is cyclic.');
  return result;
}
