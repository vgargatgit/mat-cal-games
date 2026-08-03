import { c, add, mul, pow, sin, cos, exp, relu, simplify, toLatex } from './ast.js';

export function derivative(node, variable, context = {}) {
  let result;
  switch (node.type) {
    case 'const': result = c(0); break;
    case 'var': result = c(node.name === variable ? 1 : 0); break;
    case 'add': result = add(...node.terms.map(term => derivative(term, variable, context))); break;
    case 'mul': {
      const terms = node.factors.map((factor, index) =>
        mul(...node.factors.map((other, otherIndex) => otherIndex === index ? derivative(other, variable, context) : other))
      );
      result = add(...terms);
      break;
    }
    case 'pow': {
      if (!Number.isFinite(node.exponent)) throw new Error('Only numeric exponents are supported.');
      result = mul(c(node.exponent), pow(node.base, node.exponent - 1), derivative(node.base, variable, context));
      break;
    }
    case 'sin': result = mul(cos(node.arg), derivative(node.arg, variable, context)); break;
    case 'cos': result = mul(c(-1), sin(node.arg), derivative(node.arg, variable, context)); break;
    case 'exp': result = mul(exp(node.arg), derivative(node.arg, variable, context)); break;
    case 'relu': {
      const convention = context.reluDerivativeAtZero ?? 0;
      result = mul({ type: 'reluDerivative', arg: node.arg, convention }, derivative(node.arg, variable, context));
      break;
    }
    case 'reluDerivative': result = c(0); break;
    default: throw new Error(`Unsupported derivative node: ${node.type}`);
  }
  return simplifyExtended(result);
}

export function simplifyExtended(node) {
  if (node.type === 'reluDerivative') return simplify(node);
  if (node.type === 'add') return simplify(add(...node.terms.map(simplifyExtended)));
  if (node.type === 'mul') {
    const factors = node.factors.map(simplifyExtended);
    if (factors.some(factor => factor.type === 'const' && factor.value === 0)) return c(0);
    if (factors.length === 1) return factors[0];
    if (factors.some(factor => factor.type === 'reluDerivative')) {
      const constants = factors.filter(factor => factor.type === 'const');
      const nonConstants = factors.filter(factor => factor.type !== 'const');
      const coefficient = constants.reduce((product, factor) => product * factor.value, 1);
      if (coefficient === 1 && nonConstants.length === 1) return nonConstants[0];
      return { type: 'mul', factors: coefficient === 1 ? nonConstants : [c(coefficient), ...nonConstants] };
    }
    return simplify(mul(...factors));
  }
  return simplify(node);
}

export function derivativeSteps(expression, variable, context = {}) {
  const result = derivative(expression, variable, context);
  return {
    activeVariable: variable,
    rule: ruleName(expression),
    result,
    resultLatex: extendedToLatex(result),
  };
}

function ruleName(node) {
  switch (node.type) {
    case 'const': return 'constant rule';
    case 'var': return 'variable rule';
    case 'add': return 'sum rule';
    case 'mul': return 'product rule';
    case 'pow': return 'power rule';
    case 'sin': case 'cos': case 'exp': return 'chain rule';
    case 'relu': return 'piecewise activation rule';
    default: return 'derivative rule';
  }
}

export function extendedToLatex(node) {
  return toLatex(node);
}
