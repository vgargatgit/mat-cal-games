export function normalizeExpression(value) {
  return String(value).replace(/\\/g, '').replace(/\s+/g, '').replace(/\cdot|·/g, '*').replace(/\^\{([^}]+)\}/g, '^$1').toLowerCase();
}

export function equivalentExpression(submitted, accepted) {
  const normalized = normalizeExpression(submitted);
  return accepted.some(answer => normalizeExpression(answer) === normalized);
}
