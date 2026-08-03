export function scalarShape() {
  return { rows: 1, columns: 1, semanticType: 'scalar' };
}

export function vectorShape(length, orientation = 'column') {
  return orientation === 'row'
    ? { rows: 1, columns: length, semanticType: 'vector' }
    : { rows: length, columns: 1, semanticType: 'vector' };
}

export function jacobianShape(outputShape, inputShape) {
  return {
    rows: componentCount(outputShape),
    columns: componentCount(inputShape),
    semanticType: componentCount(outputShape) === 1 && componentCount(inputShape) === 1 ? 'scalar' : 'matrix'
  };
}

export function componentCount(shape) {
  if (!shape || !Number.isInteger(shape.rows) || !Number.isInteger(shape.columns)) throw new TypeError('Invalid shape.');
  return shape.semanticType === 'scalar' ? 1 : shape.rows * shape.columns;
}

export function sameShape(a, b) {
  return Boolean(a && b && a.rows === b.rows && a.columns === b.columns);
}

export function validateChainShapes(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return { valid: false, reason: 'Add at least one derivative block.' };
  for (let index = 0; index < blocks.length - 1; index += 1) {
    if (blocks[index].columns !== blocks[index + 1].rows) {
      return {
        valid: false,
        mismatchIndex: index,
        reason: `Inner dimensions ${blocks[index].columns} and ${blocks[index + 1].rows} do not match.`
      };
    }
  }
  return {
    valid: true,
    shape: { rows: blocks[0].rows, columns: blocks.at(-1).columns, semanticType: blocks[0].rows === 1 && blocks.at(-1).columns === 1 ? 'scalar' : 'matrix' }
  };
}

export function shapeLabel(shape) {
  if (shape.semanticType === 'scalar') return 'scalar (1×1)';
  return `${shape.rows}×${shape.columns}`;
}

export function multiplyMatrices(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) throw new TypeError('Matrices must be non-empty arrays.');
  const leftColumns = left[0].length;
  if (left.some(row => row.length !== leftColumns) || right.some(row => row.length !== right[0].length)) throw new TypeError('Matrices must be rectangular.');
  if (leftColumns !== right.length) throw new RangeError(`Cannot multiply ${left.length}×${leftColumns} by ${right.length}×${right[0].length}.`);
  return left.map(row => right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
}
