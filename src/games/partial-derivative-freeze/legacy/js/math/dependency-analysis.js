import { collectVariables, topLevelTerms, toPlain } from './expression-model.js';

export function dependsOn(expression, variableName, dependencyContext = {}) {
  if (!expression) return false;
  switch (expression.type) {
    case 'constant': return false;
    case 'variable': {
      if (expression.name === variableName) return true;
      const declared = dependencyContext.dependencies?.[expression.name] || [];
      return declared.includes(variableName);
    }
    case 'dependent-variable':
      return expression.name === variableName || expression.dependsOn.includes(variableName);
    case 'derivative-symbol':
      return false;
    case 'sum':
      return expression.terms.some((term) => dependsOn(term, variableName, dependencyContext));
    case 'product':
      return expression.factors.some((factor) => dependsOn(factor, variableName, dependencyContext));
    case 'power':
      return dependsOn(expression.base, variableName, dependencyContext);
    case 'function':
      return dependsOn(expression.argument, variableName, dependencyContext);
    default:
      return false;
  }
}

export function classifyVariableRole(variableName, activeVariable, context = {}) {
  if (/^-?\d+(\.\d+)?$/.test(String(variableName))) return 'numerical-constant';
  if (variableName === activeVariable) return 'active';
  const dependencies = context.dependencies?.[variableName] || [];
  if (dependencies.includes(activeVariable)) return 'dependent';
  return 'frozen-independent';
}

export function classifyTerms(expression, activeVariable, context = {}) {
  return topLevelTerms(expression).map((term, index) => ({
    index,
    term,
    key: toPlain(term),
    dependsOnActiveVariable: dependsOn(term, activeVariable, context),
    kind: classifyMixedTerm(term, activeVariable, context)
  }));
}

export function classifyMixedTerm(expression, activeVariable, context = {}) {
  if (!dependsOn(expression, activeVariable, context)) return 'unchanged';
  if (expression.type === 'product') {
    const activeFactors = expression.factors.filter((factor) => dependsOn(factor, activeVariable, context));
    const frozenFactors = expression.factors.filter((factor) => !dependsOn(factor, activeVariable, context));
    if (activeFactors.length && frozenFactors.length) return 'mixed';
  }
  return 'changes';
}

export function inspectVariables(expression, activeVariable, context = {}) {
  return [...collectVariables(expression).values()].map((entry) => ({
    ...entry,
    role: classifyVariableRole(entry.name, activeVariable, context)
  }));
}

export function findDependencyPaths(outputNode, inputVariable, graph) {
  const adjacency = new Map();
  graph.edges.forEach(({ from, to, localDerivative = null }) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, localDerivative });
  });
  const paths = [];
  const visit = (node, path, visited) => {
    if (node === outputNode) {
      paths.push(path);
      return;
    }
    for (const edge of adjacency.get(node) || []) {
      if (visited.has(edge.to)) continue;
      const nextVisited = new Set(visited);
      nextVisited.add(edge.to);
      visit(edge.to, [...path, edge], nextVisited);
    }
  };
  visit(inputVariable, [], new Set([inputVariable]));
  return paths;
}

export function dependencyGraphDescription(round) {
  const active = round.activeVariable;
  const termDescriptions = classifyTerms(round.expression, active, round.context).map((entry) => {
    if (entry.dependsOnActiveVariable) {
      return `The term ${entry.key} has a dependency path from ${active}.`;
    }
    return `The term ${entry.key} has no dependency path from ${active}.`;
  });
  const frozen = round.variables.filter((v) => v.name !== active && v.role !== 'dependent').map((v) => v.name);
  return `${active} is active. ${frozen.length ? `${frozen.join(', ')} ${frozen.length === 1 ? 'is' : 'are'} held fixed. ` : ''}${termDescriptions.join(' ')}`;
}
