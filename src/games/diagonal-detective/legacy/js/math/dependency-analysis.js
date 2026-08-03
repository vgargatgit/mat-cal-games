import { adjacencyMap } from './computation-graph.js';

export function findAllDependencyPaths(outputName, inputName, graph, limit = 20) {
  const adjacency = adjacencyMap(graph);
  const paths = [];
  const visit = (node, path) => {
    if (paths.length >= limit) return;
    if (node === outputName) { paths.push(path); return; }
    for (const next of adjacency.get(node) ?? []) {
      if (!path.includes(next)) visit(next, [...path, next]);
    }
  };
  visit(inputName, [inputName]);
  return paths;
}

export function structurallyDependsOn(outputName, inputName, graph) {
  return findAllDependencyPaths(outputName, inputName, graph, 1).length > 0;
}

export function buildDependencyMatrix(outputs, inputs, graph) {
  return outputs.map(output => inputs.map(input => structurallyDependsOn(output.name, input.name, graph)));
}

export function buildDependencyCells(outputs, inputs, graph) {
  return outputs.map((output, row) => inputs.map((input, column) => {
    const dependencyPaths = findAllDependencyPaths(output.name, input.name, graph);
    return {
      row,
      column,
      output: output.name,
      input: input.name,
      structurallyDepends: dependencyPaths.length > 0,
      dependencyPaths
    };
  }));
}

export function explainDependency(outputName, inputName, graph) {
  const paths = findAllDependencyPaths(outputName, inputName, graph);
  if (!paths.length) return `No computation path connects ${inputName} to ${outputName}. The Jacobian cell is structurally zero.`;
  if (paths.length === 1) return `${inputName} affects ${outputName} through ${paths[0].join(' → ')}.`;
  return `${inputName} affects ${outputName} through ${paths.length} paths: ${paths.map(path => path.join(' → ')).join('; ')}. Their derivative contributions combine in one Jacobian cell.`;
}
