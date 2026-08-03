import { constant, sum, product, power, toPlain } from './expression-model.js';

const isZero = (node) => node.type === 'constant' && node.value === 0;
const isOne = (node) => node.type === 'constant' && node.value === 1;

export function simplifyExpression(expression) {
  switch (expression.type) {
    case 'constant':
    case 'variable':
    case 'dependent-variable':
    case 'derivative-symbol':
      return expression;
    case 'power': {
      const base = simplifyExpression(expression.base);
      if (expression.exponent === 0) return constant(1);
      if (expression.exponent === 1) return base;
      if (base.type === 'constant') return constant(base.value ** expression.exponent);
      return power(base, expression.exponent);
    }
    case 'function':
      return { ...expression, argument: simplifyExpression(expression.argument) };
    case 'sum': {
      const flattened = expression.terms.flatMap((term) => {
        const simplified = simplifyExpression(term);
        return simplified.type === 'sum' ? simplified.terms : [simplified];
      }).filter((term) => !isZero(term));
      let constantTotal = 0;
      const rest = [];
      flattened.forEach((term) => {
        if (term.type === 'constant') constantTotal += term.value;
        else rest.push(term);
      });
      if (constantTotal !== 0) rest.push(constant(constantTotal));
      if (!rest.length) return constant(0);
      if (rest.length === 1) return rest[0];
      return sum(...rest);
    }
    case 'product': {
      const flattened = expression.factors.flatMap((factor) => {
        const simplified = simplifyExpression(factor);
        return simplified.type === 'product' ? simplified.factors : [simplified];
      });
      if (flattened.some(isZero)) return constant(0);
      let coefficient = 1;
      const rest = [];
      flattened.forEach((factor) => {
        if (factor.type === 'constant') coefficient *= factor.value;
        else if (!isOne(factor)) rest.push(factor);
      });
      rest.sort((a, b) => toPlain(a).localeCompare(toPlain(b)));
      const factors = coefficient === 1 ? rest : [constant(coefficient), ...rest];
      if (!factors.length) return constant(coefficient);
      if (factors.length === 1) return factors[0];
      return product(...factors);
    }
    default:
      throw new Error(`Cannot simplify node type ${expression.type}`);
  }
}

export function canonicalExpression(expression) {
  const simplified = simplifyExpression(expression);
  return canonicalNode(simplified);
}

function canonicalNode(expression) {
  switch (expression.type) {
    case 'constant': return `C:${expression.value}`;
    case 'variable': return `V:${expression.name}`;
    case 'dependent-variable': return `DV:${expression.name}(${[...expression.dependsOn].sort().join(',')})`;
    case 'derivative-symbol': return `D:${expression.numerator}/${expression.denominator}`;
    case 'power': return `P:${canonicalNode(expression.base)}^${expression.exponent}`;
    case 'function': return `F:${expression.name}(${canonicalNode(expression.argument)})`;
    case 'product': return `M:${expression.factors.map(canonicalNode).sort().join('|')}`;
    case 'sum': return `S:${expression.terms.map(canonicalNode).sort().join('|')}`;
    default: return '?';
  }
}
