export function buildStructuralJacobian(dependencyMatrix) {
  return dependencyMatrix.map((row, rowIndex) => row.map((depends, columnIndex) => ({
    row: rowIndex,
    column: columnIndex,
    structurallyDepends: Boolean(depends),
    marker: depends ? 'possible' : 'structural-zero'
  })));
}

export function structuralZeroCount(matrix) {
  return matrix.flat().filter(cell => !cell.structurallyDepends).length;
}

export function structuralMatrixToText(matrix, outputs, inputs) {
  const rows = matrix.map((row, rowIndex) => {
    const columns = row.map((cell, columnIndex) => cell.structurallyDepends ? inputs[columnIndex].name : null).filter(Boolean);
    return columns.length
      ? `${outputs[rowIndex].name} may have nonzero derivatives with respect to ${columns.join(', ')}.`
      : `${outputs[rowIndex].name} has a structurally zero row.`;
  });
  return `A ${matrix.length}-by-${matrix[0]?.length ?? 0} structural Jacobian. ${rows.join(' ')}`;
}

export function classifyZeroReason({ structurallyDepends, derivativeIdenticallyZero = false, evaluatedValue = null, activationState = null, tolerance = 1e-10 }) {
  if (!structurallyDepends) return 'no-dependency';
  if (derivativeIdenticallyZero) return 'identically-zero';
  if (activationState === 'inactive-relu') return 'inactive-activation';
  if (evaluatedValue !== null && Math.abs(Number(evaluatedValue)) <= tolerance) return 'local-slope-zero';
  return 'nonzero';
}
