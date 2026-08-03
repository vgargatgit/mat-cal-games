export const variable = name => ({ type: 'variable', name });
export const ref = name => ({ type: 'ref', name });
export const constant = value => ({ type: 'constant', value });
export const sum = (...terms) => ({ type: 'sum', terms: terms.flat() });
export const product = (...factors) => ({ type: 'product', factors: factors.flat() });
export const power = (base, exponent) => ({ type: 'power', base, exponent });
export const func = (name, argument) => ({ type: 'function', name, argument });
export const negate = expression => product(constant(-1), expression);

export function deepCloneExpression(expression) {
  return structuredClone(expression);
}

export function collectDirectReferences(expression, found = new Set()) {
  if (!expression || typeof expression !== 'object') return found;
  switch (expression.type) {
    case 'variable':
    case 'ref':
      found.add(expression.name);
      break;
    case 'sum':
      expression.terms.forEach(term => collectDirectReferences(term, found));
      break;
    case 'product':
      expression.factors.forEach(factor => collectDirectReferences(factor, found));
      break;
    case 'power':
      collectDirectReferences(expression.base, found);
      break;
    case 'function':
      collectDirectReferences(expression.argument, found);
      break;
    case 'constant':
      break;
    default:
      throw new Error(`Unsupported expression node: ${expression.type}`);
  }
  return found;
}

export function expandExpression(expression, context = {}, stack = []) {
  if (!expression || typeof expression !== 'object') throw new Error('Invalid expression');
  if (expression.type === 'ref') {
    const definition = context.intermediates?.[expression.name];
    if (!definition) return variable(expression.name);
    if (stack.includes(expression.name)) throw new Error(`Cycle detected while expanding ${expression.name}`);
    return expandExpression(definition, context, [...stack, expression.name]);
  }
  switch (expression.type) {
    case 'variable':
    case 'constant':
      return deepCloneExpression(expression);
    case 'sum':
      return sum(expression.terms.map(term => expandExpression(term, context, stack)));
    case 'product':
      return product(expression.factors.map(factor => expandExpression(factor, context, stack)));
    case 'power':
      return power(expandExpression(expression.base, context, stack), expression.exponent);
    case 'function':
      return func(expression.name, expandExpression(expression.argument, context, stack));
    default:
      throw new Error(`Unsupported expression node: ${expression.type}`);
  }
}

export function evaluateExpression(expression, values = {}, context = {}, stack = []) {
  switch (expression.type) {
    case 'constant': return Number(expression.value);
    case 'variable': {
      if (!(expression.name in values)) throw new Error(`Missing value for ${expression.name}`);
      return Number(values[expression.name]);
    }
    case 'ref': {
      if (expression.name in values) return Number(values[expression.name]);
      const definition = context.intermediates?.[expression.name];
      if (!definition) throw new Error(`Missing intermediate definition for ${expression.name}`);
      if (stack.includes(expression.name)) throw new Error(`Cycle detected at ${expression.name}`);
      return evaluateExpression(definition, values, context, [...stack, expression.name]);
    }
    case 'sum': return expression.terms.reduce((total, term) => total + evaluateExpression(term, values, context, stack), 0);
    case 'product': return expression.factors.reduce((total, factor) => total * evaluateExpression(factor, values, context, stack), 1);
    case 'power': return Math.pow(evaluateExpression(expression.base, values, context, stack), expression.exponent);
    case 'function': {
      const value = evaluateExpression(expression.argument, values, context, stack);
      switch (expression.name) {
        case 'sin': return Math.sin(value);
        case 'cos': return Math.cos(value);
        case 'exp': return Math.exp(value);
        case 'tanh': return Math.tanh(value);
        case 'sigmoid': return 1 / (1 + Math.exp(-value));
        case 'relu': return Math.max(0, value);
        default: throw new Error(`Unsupported function: ${expression.name}`);
      }
    }
    default: throw new Error(`Unsupported expression node: ${expression.type}`);
  }
}

function needsParens(expression) {
  return expression.type === 'sum';
}

export function expressionToLatex(expression) {
  switch (expression.type) {
    case 'constant': return String(expression.value);
    case 'variable':
    case 'ref': return expression.name.replace(/_(\d+)/g, '_{$1}');
    case 'sum': {
      const pieces = expression.terms.map(expressionToLatex);
      return pieces.join(' + ').replace(/\+ -/g, '- ');
    }
    case 'product': {
      if (expression.factors.length === 0) return '1';
      return expression.factors.map((factor, index) => {
        const latex = expressionToLatex(factor);
        if (needsParens(factor)) return `\\left(${latex}\\right)`;
        if (index > 0 && factor.type === 'constant' && Number(factor.value) < 0) return `\\left(${latex}\\right)`;
        return latex;
      }).join('\\,');
    }
    case 'power': {
      const base = needsParens(expression.base) ? `\\left(${expressionToLatex(expression.base)}\\right)` : expressionToLatex(expression.base);
      return `${base}^{${expression.exponent}}`;
    }
    case 'function': {
      const arg = expressionToLatex(expression.argument);
      if (expression.name === 'exp') return `e^{${arg}}`;
      if (expression.name === 'relu') return `\\operatorname{ReLU}\\left(${arg}\\right)`;
      if (expression.name === 'sigmoid') return `\\sigma\\left(${arg}\\right)`;
      return `\\${expression.name}\\left(${arg}\\right)`;
    }
    default: throw new Error(`Unsupported expression node: ${expression.type}`);
  }
}

export function substituteExpression(expression, replacements = {}) {
  if (expression.type === 'variable' && replacements[expression.name]) return deepCloneExpression(replacements[expression.name]);
  switch (expression.type) {
    case 'constant':
    case 'variable':
    case 'ref': return deepCloneExpression(expression);
    case 'sum': return sum(expression.terms.map(term => substituteExpression(term, replacements)));
    case 'product': return product(expression.factors.map(factor => substituteExpression(factor, replacements)));
    case 'power': return power(substituteExpression(expression.base, replacements), expression.exponent);
    case 'function': return func(expression.name, substituteExpression(expression.argument, replacements));
    default: throw new Error(`Unsupported expression node: ${expression.type}`);
  }
}
