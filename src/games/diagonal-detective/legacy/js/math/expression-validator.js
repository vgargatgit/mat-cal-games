const ALLOWED_TYPES = new Set(['variable','ref','constant','sum','product','power','function']);
const ALLOWED_FUNCTIONS = new Set(['sin','cos','exp','tanh','sigmoid','relu']);

export function validateExpression(expression, declaredNames = new Set()) {
  const errors = [];
  const visit = node => {
    if (!node || typeof node !== 'object') { errors.push('Expression node must be an object.'); return; }
    if (!ALLOWED_TYPES.has(node.type)) { errors.push(`Unsupported expression type: ${node.type}`); return; }
    if ((node.type === 'variable' || node.type === 'ref')) {
      if (typeof node.name !== 'string' || !node.name) errors.push('Variable/ref requires a name.');
      else if (declaredNames.size && !declaredNames.has(node.name)) errors.push(`Undeclared name: ${node.name}`);
    }
    if (node.type === 'constant' && !Number.isFinite(Number(node.value))) errors.push('Constant must be finite.');
    if (node.type === 'sum') {
      if (!Array.isArray(node.terms) || node.terms.length < 1) errors.push('Sum requires terms.');
      else node.terms.forEach(visit);
    }
    if (node.type === 'product') {
      if (!Array.isArray(node.factors) || node.factors.length < 1) errors.push('Product requires factors.');
      else node.factors.forEach(visit);
    }
    if (node.type === 'power') {
      if (!Number.isInteger(node.exponent) || node.exponent < 0 || node.exponent > 6) errors.push('Power exponent must be an integer from 0 to 6.');
      visit(node.base);
    }
    if (node.type === 'function') {
      if (!ALLOWED_FUNCTIONS.has(node.name)) errors.push(`Unsupported function: ${node.name}`);
      visit(node.argument);
    }
  };
  visit(expression);
  return { valid: errors.length === 0, errors };
}
