export function getComponentCount(shape) {
  if (!Array.isArray(shape) || shape.length === 0) return 1;
  return shape.reduce((a, b) => a * b, 1);
}

export function getJacobianShape(outputShape, inputShape) {
  return [getComponentCount(outputShape), getComponentCount(inputShape)];
}

export function createZeroMatrix(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill('0'));
}

export function createIdentityMatrix(size) {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? '1' : '0'))
  );
}

export function createDiagonalMatrix(values) {
  return values.map((value, r) => values.map((_, c) => (r === c ? value : '0')));
}

export function transpose(matrix) {
  if (!matrix.length) return [];
  return matrix[0].map((_, c) => matrix.map(row => row[c]));
}

export function matrixShape(matrix) {
  return [matrix.length, matrix[0]?.length ?? 0];
}

export function validateMatrixMultiplication(leftShape, rightShape) {
  return leftShape[1] === rightShape[0];
}

export function multiplyMatrices(a, b) {
  const [ar, ac] = matrixShape(a);
  const [br, bc] = matrixShape(b);
  if (ac !== br) throw new Error(`Incompatible shapes ${ar}×${ac} and ${br}×${bc}`);
  return Array.from({ length: ar }, (_, r) =>
    Array.from({ length: bc }, (_, c) =>
      Array.from({ length: ac }, (_, k) => `(${a[r][k]})(${b[k][c]})`).join(' + ')
    )
  );
}

export function multiplyNumericMatrices(a, b) {
  const [ar, ac] = matrixShape(a);
  const [br, bc] = matrixShape(b);
  if (ac !== br) throw new Error(`Incompatible shapes ${ar}×${ac} and ${br}×${bc}`);
  return Array.from({ length: ar }, (_, r) =>
    Array.from({ length: bc }, (_, c) =>
      Array.from({ length: ac }, (_, k) => Number(a[r][k]) * Number(b[k][c])).reduce((x, y) => x + y, 0)
    )
  );
}

export function jacobianTransposeVectorProduct(jacobian, gradient) {
  const jt = transpose(jacobian);
  return jt.map(row => row.reduce((sum, value, i) => sum + Number(value) * Number(gradient[i]), 0));
}

export function canonical(value) {
  return String(value)
    .replaceAll(' ', '')
    .replaceAll('·', '')
    .replaceAll('*', '')
    .replaceAll('−', '-')
    .replaceAll('²', '^2')
    .replaceAll('₁', '1').replaceAll('₂', '2').replaceAll('₃', '3').replaceAll('₄', '4')
    .toLowerCase();
}

export function matricesEqual(a, b) {
  if (a.length !== b.length || a[0]?.length !== b[0]?.length) return false;
  return a.every((row, r) => row.every((value, c) => canonical(value) === canonical(b[r][c])));
}

export function dependenciesFromEntries(entries) {
  return entries.map(row => row.map(value => canonical(value) !== '0'));
}

export function structureMatches(candidate, dependencies) {
  return candidate.every((row, r) => row.every((value, c) => Boolean(value) === Boolean(dependencies[r][c])));
}
