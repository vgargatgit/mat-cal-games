export function zeroMatrix(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

export function identityMatrix(size, diagonal = 1) {
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => row === column ? diagonal : 0));
}

export function diagonalMatrix(values) {
  return Array.from({ length: values.length }, (_, row) => Array.from({ length: values.length }, (_, column) => row === column ? values[row] : 0));
}

export function columnMatrix(values) { return values.map((value) => [value]); }
export function rowMatrix(values) { return [values.slice()]; }

export function classifyDerivativeStructure(matrix) {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  if (rows === 1 && columns === 1) return ['scalar'];
  if (columns === 1) return ['full-column'];
  if (rows === 1) return ['row-vector', 'reduction'];
  const isDiagonal = rows === columns && matrix.every((row, i) => row.every((value, j) => i === j || Number(value) === 0));
  if (isDiagonal) {
    const diagonal = matrix.map((row, i) => row[i]);
    const isIdentity = diagonal.every((value) => Number(value) === 1);
    const same = diagonal.every((value) => String(value) === String(diagonal[0]));
    return [isIdentity ? 'identity' : same ? 'scaled-identity' : 'diagonal', 'diagonal', 'sparse'];
  }
  return ['dense'];
}
