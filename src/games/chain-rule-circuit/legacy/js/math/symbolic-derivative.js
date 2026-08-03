export function localDerivative(edge, graphContext = {}) {
  if (edge.localDerivative) return structuredClone(edge.localDerivative);
  const node = graphContext.nodes?.find(candidate => candidate.id === edge.to);
  if (!node?.operation) throw new Error(`No operation for edge ${edge.from}→${edge.to}.`);
  const input = edge.from;
  const output = edge.to;
  const other = graphContext.edges?.find(candidate => candidate.to === output && candidate.from !== input)?.from;
  const expressions = {
    add: '1', subtract: (edge.inputIndex ?? 0) === 0 ? '1' : '-1', square: `2${input}`, power: `${node.operation.params?.exponent ?? 'k'}${input}^{${(node.operation.params?.exponent ?? 1) - 1}}`, sin: `cos(${input})`, cos: `-sin(${input})`, exp: `exp(${input})`, tanh: `1-tanh^2(${input})`, sigmoid: `${output}(1-${output})`, relu: `${input}>0 ? 1 : 0`, identity: '1', multiply: other ?? 'other input', dot: other ? `${other}^T` : 'other input', sum: '1^T', mean: '(1/n)1^T', broadcastAdd: '1', scalarMultiply: other ?? 'scalar', elementwiseMultiply: other ? `diag(${other})` : 'diagonal of other input', elementwiseActivation: `diag(g'(${input}))`, affine: node.operation.params?.matrixSymbol ?? 'A'
  };
  return { expression: expressions[node.operation.type] ?? '?', shape: edge.derivativeShape ?? { rows: 1, columns: 1, semanticType: 'scalar' } };
}
