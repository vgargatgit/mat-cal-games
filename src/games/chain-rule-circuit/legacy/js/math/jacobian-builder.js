export function diagonalJacobian(values) {
  return values.map((value, row) => values.map((_, column) => row === column ? value : 0));
}

export function rowOfOnes(length) { return [Array.from({ length }, () => 1)]; }
export function columnOfOnes(length) { return Array.from({ length }, () => [1]); }
