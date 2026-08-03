export const NUMERATOR_LAYOUT = 'numerator';

export function shape(rows, columns, semanticType = null) {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) {
    throw new TypeError(`Invalid shape ${rows}x${columns}`);
  }
  return Object.freeze({
    rows,
    columns,
    semanticType: semanticType ?? classifyShape(rows, columns)
  });
}

export function classifyShape(rows, columns, preferScalar = true) {
  if (rows === 1 && columns === 1 && preferScalar) return 'scalar';
  if (rows === 1 && columns > 1) return 'row-vector';
  if (rows > 1 && columns === 1) return 'column-vector';
  return 'matrix';
}

export function derivativeShape(outputComponents, inputComponents, convention = NUMERATOR_LAYOUT) {
  if (convention !== NUMERATOR_LAYOUT) {
    throw new Error(`Unsupported convention: ${convention}`);
  }
  return shape(outputComponents, inputComponents);
}

export function transposeShape(value) {
  return shape(value.columns, value.rows);
}

export function canMultiply(left, right) {
  return left.columns === right.rows;
}

export function multiplyShapes(left, right) {
  if (!canMultiply(left, right)) {
    throw new Error(`Cannot multiply ${formatShape(left)} by ${formatShape(right)}`);
  }
  return shape(left.rows, right.columns);
}

export function formatShape(value) {
  return `${value.rows} × ${value.columns}`;
}

export function sameShape(a, b) {
  return a.rows === b.rows && a.columns === b.columns;
}

export function outputInputReason(expected) {
  return {
    rows: `${expected.rows} output component${expected.rows === 1 ? '' : 's'} → ${expected.rows} row${expected.rows === 1 ? '' : 's'}`,
    columns: `${expected.columns} input component${expected.columns === 1 ? '' : 's'} → ${expected.columns} column${expected.columns === 1 ? '' : 's'}`
  };
}
