export const scalarShape = () => ({ semanticType: 'scalar', rows: 1, columns: 1, components: 1 });
export const columnVectorShape = (length) => ({ semanticType: 'column-vector', rows: length, columns: 1, length, components: length });
export const rowVectorShape = (length) => ({ semanticType: 'row-vector', rows: 1, columns: length, length, components: length });
export const matrixShape = (rows, columns) => ({ semanticType: 'matrix', rows, columns, components: rows * columns });

export function operandShape(operand) {
  switch (operand.semanticType) {
    case 'scalar': return scalarShape();
    case 'column-vector': return columnVectorShape(operand.length ?? operand.values?.length ?? 0);
    case 'row-vector': return rowVectorShape(operand.length ?? operand.values?.length ?? 0);
    case 'matrix': return matrixShape(operand.rows ?? operand.values?.length ?? 0, operand.columns ?? operand.values?.[0]?.length ?? 0);
    default: throw new Error(`Unknown semantic type: ${operand.semanticType}`);
  }
}

export function derivativeShape(outputShape, inputShape) {
  return {
    semanticType: outputShape.components === 1 && inputShape.components === 1
      ? 'scalar'
      : outputShape.components === 1
        ? 'row-vector'
        : inputShape.components === 1
          ? 'column-vector'
          : 'matrix',
    rows: outputShape.components,
    columns: inputShape.components,
    components: outputShape.components * inputShape.components
  };
}

export function shapeLabel(shape) {
  if (shape.semanticType === 'scalar') return 'scalar (1×1)';
  if (shape.semanticType === 'column-vector') return `column vector (${shape.rows}×1)`;
  if (shape.semanticType === 'row-vector') return `row vector (1×${shape.columns})`;
  return `matrix (${shape.rows}×${shape.columns})`;
}

export function sameShape(a, b) {
  return a.rows === b.rows && a.columns === b.columns;
}
