const getBoolean = cell => typeof cell === 'boolean' ? cell : Boolean(cell.structurallyDepends);

export function isSquare(matrix) {
  return matrix.length > 0 && matrix.length === matrix[0].length;
}

export function isDiagonal(matrix) {
  if (!isSquare(matrix)) return false;
  return matrix.every((row, i) => row.every((cell, j) => i === j || !getBoolean(cell)));
}

export function isFullyDense(matrix) {
  return matrix.length > 0 && matrix.every(row => row.every(getBoolean));
}

export function isUpperTriangular(matrix) {
  if (!isSquare(matrix)) return false;
  return matrix.every((row, i) => row.every((cell, j) => j >= i || !getBoolean(cell)));
}

export function isLowerTriangular(matrix) {
  if (!isSquare(matrix)) return false;
  return matrix.every((row, i) => row.every((cell, j) => j <= i || !getBoolean(cell)));
}

export function isPermutationLike(matrix) {
  if (!isSquare(matrix)) return false;
  const rowCounts = matrix.map(row => row.filter(getBoolean).length);
  const columnCounts = matrix[0].map((_, j) => matrix.filter(row => getBoolean(row[j])).length);
  return rowCounts.every(count => count === 1) && columnCounts.every(count => count === 1) && !isDiagonal(matrix);
}

export function findZeroRows(matrix) {
  return matrix.map((row, i) => row.every(cell => !getBoolean(cell)) ? i : -1).filter(i => i >= 0);
}

export function findZeroColumns(matrix) {
  if (!matrix.length) return [];
  return matrix[0].map((_, j) => matrix.every(row => !getBoolean(row[j])) ? j : -1).filter(j => j >= 0);
}

export function findContiguousBlocks(matrix) {
  if (!isSquare(matrix) || matrix.length < 3) return [];
  const n = matrix.length;
  for (let split = 1; split < n; split += 1) {
    let cross = false;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const inDifferentBlocks = (i < split && j >= split) || (i >= split && j < split);
        if (inDifferentBlocks && getBoolean(matrix[i][j])) cross = true;
      }
    }
    const firstHasEdge = matrix.slice(0, split).some(row => row.slice(0, split).some(getBoolean));
    const secondHasEdge = matrix.slice(split).some(row => row.slice(split).some(getBoolean));
    const firstCoupled = matrix.slice(0, split).some((row, localI) => row.slice(0, split).some((cell, localJ) => localI !== localJ && getBoolean(cell)));
    const secondCoupled = matrix.slice(split).some((row, localI) => row.slice(split).some((cell, localJ) => localI !== localJ && getBoolean(cell)));
    if (!cross && firstHasEdge && secondHasEdge && (firstCoupled || secondCoupled)) return [[0, split - 1], [split, n - 1]];
  }
  return [];
}

export function isIdentityJacobian(structuralMatrix, symbolicJacobian) {
  if (!isDiagonal(structuralMatrix) || !symbolicJacobian || symbolicJacobian.length !== structuralMatrix.length) return false;
  for (let i = 0; i < symbolicJacobian.length; i += 1) {
    for (let j = 0; j < symbolicJacobian[i].length; j += 1) {
      const normalized = String(symbolicJacobian[i][j]).replace(/\s+/g, '');
      if (i === j && normalized !== '1') return false;
      if (i !== j && normalized !== '0') return false;
    }
  }
  return true;
}

export function classifyStructuralPattern(matrix, symbolicJacobian = null, sparseThreshold = 1 / 3) {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const total = rows * columns;
  const zeros = matrix.flat().filter(cell => !getBoolean(cell)).length;
  const diagonal = isDiagonal(matrix);
  const blocks = findContiguousBlocks(matrix);
  return {
    square: isSquare(matrix),
    diagonal,
    identity: isIdentityJacobian(matrix, symbolicJacobian),
    sparse: total > 0 && zeros / total >= sparseThreshold,
    dense: isFullyDense(matrix),
    upperTriangular: isUpperTriangular(matrix),
    lowerTriangular: isLowerTriangular(matrix),
    blockDiagonal: blocks.length > 0,
    permutationLike: isPermutationLike(matrix),
    zeroRows: findZeroRows(matrix),
    zeroColumns: findZeroColumns(matrix),
    zeroFraction: total ? zeros / total : 0,
    blocks
  };
}
