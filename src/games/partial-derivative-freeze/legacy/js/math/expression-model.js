export const constant = (value) => ({ type: 'constant', value: Number(value) });
export const variable = (name) => ({ type: 'variable', name });
export const dependentVariable = (name, dependsOn = []) => ({ type: 'dependent-variable', name, dependsOn: [...dependsOn] });
export const sum = (...terms) => ({ type: 'sum', terms: terms.flat() });
export const product = (...factors) => ({ type: 'product', factors: factors.flat() });
export const power = (base, exponent) => ({ type: 'power', base, exponent: Number(exponent) });
export const fn = (name, argument) => ({ type: 'function', name, argument });
export const derivativeSymbol = (numerator, denominator) => ({ type: 'derivative-symbol', numerator, denominator });

export function cloneExpression(expression) {
  return structuredClone(expression);
}

export function topLevelTerms(expression) {
  return expression.type === 'sum' ? expression.terms : [expression];
}

export function collectVariables(expression, result = new Map()) {
  if (!expression) return result;
  switch (expression.type) {
    case 'variable':
      result.set(expression.name, { name: expression.name, dependent: false, dependsOn: [] });
      break;
    case 'dependent-variable':
      result.set(expression.name, { name: expression.name, dependent: true, dependsOn: [...expression.dependsOn] });
      break;
    case 'sum':
      expression.terms.forEach((term) => collectVariables(term, result));
      break;
    case 'product':
      expression.factors.forEach((factor) => collectVariables(factor, result));
      break;
    case 'power':
      collectVariables(expression.base, result);
      break;
    case 'function':
      collectVariables(expression.argument, result);
      break;
    default:
      break;
  }
  return result;
}

function needsParens(expression, parentType) {
  if (!expression) return false;
  if (parentType === 'product' && expression.type === 'sum') return true;
  if (parentType === 'power' && ['sum', 'product'].includes(expression.type)) return true;
  return false;
}

export function toLatex(expression, parentType = null) {
  if (!expression) return '';
  let rendered = '';
  switch (expression.type) {
    case 'constant':
      rendered = String(expression.value);
      break;
    case 'variable':
      rendered = latexIdentifier(expression.name);
      break;
    case 'dependent-variable':
      rendered = `${latexIdentifier(expression.name)}(${latexIdentifier(expression.dependsOn[0] || 'x')})`;
      break;
    case 'derivative-symbol':
      rendered = `\\frac{d${latexIdentifier(expression.numerator)}}{d${latexIdentifier(expression.denominator)}}`;
      break;
    case 'sum': {
      rendered = expression.terms.map((term, index) => {
        const text = toLatex(term, 'sum');
        if (index > 0 && text.startsWith('-')) return `- ${text.slice(1)}`;
        return index > 0 ? `+ ${text}` : text;
      }).join(' ');
      break;
    }
    case 'product': {
      rendered = expression.factors.map((factor, index) => {
        const text = toLatex(factor, 'product');
        if (index === 0) return text;
        const previous = expression.factors[index - 1];
        const useDot = previous.type === 'constant' && factor.type === 'constant';
        return `${useDot ? '\\cdot ' : ''}${text}`;
      }).join('');
      break;
    }
    case 'power':
      rendered = `${toLatex(expression.base, 'power')}^{${expression.exponent}}`;
      break;
    case 'function':
      rendered = `\\${expression.name}\\left(${toLatex(expression.argument)}\\right)`;
      break;
    default:
      rendered = '?';
  }
  return needsParens(expression, parentType) ? `\\left(${rendered}\\right)` : rendered;
}

export function toPlain(expression, parentType = null) {
  if (!expression) return '';
  let rendered = '';
  switch (expression.type) {
    case 'constant': rendered = String(expression.value); break;
    case 'variable': rendered = expression.name; break;
    case 'dependent-variable': rendered = expression.name; break;
    case 'derivative-symbol': rendered = `d${expression.numerator}/d${expression.denominator}`; break;
    case 'sum': rendered = expression.terms.map((term, index) => {
      const text = toPlain(term, 'sum');
      if (index > 0 && text.startsWith('-')) return `- ${text.slice(1)}`;
      return index > 0 ? `+ ${text}` : text;
    }).join(' '); break;
    case 'product': rendered = expression.factors.map((factor) => toPlain(factor, 'product')).join('*'); break;
    case 'power': rendered = `${toPlain(expression.base, 'power')}^${expression.exponent}`; break;
    case 'function': rendered = `${expression.name}(${toPlain(expression.argument)})`; break;
    default: rendered = '?';
  }
  return needsParens(expression, parentType) ? `(${rendered})` : rendered;
}

export function latexIdentifier(name) {
  return String(name).replace(/([a-zA-Z]+)(\d+)$/, '$1_{$2}');
}

export function evaluateExpression(expression, environment = {}) {
  switch (expression.type) {
    case 'constant': return expression.value;
    case 'variable': return Number(environment[expression.name] ?? 0);
    case 'dependent-variable': {
      const direct = environment[expression.name];
      if (typeof direct === 'function') return Number(direct(environment));
      return Number(direct ?? 0);
    }
    case 'derivative-symbol': return Number(environment[`d${expression.numerator}_d${expression.denominator}`] ?? 1);
    case 'sum': return expression.terms.reduce((acc, term) => acc + evaluateExpression(term, environment), 0);
    case 'product': return expression.factors.reduce((acc, factor) => acc * evaluateExpression(factor, environment), 1);
    case 'power': return evaluateExpression(expression.base, environment) ** expression.exponent;
    case 'function': {
      const value = evaluateExpression(expression.argument, environment);
      if (expression.name === 'sin') return Math.sin(value);
      if (expression.name === 'cos') return Math.cos(value);
      if (expression.name === 'exp') return Math.exp(value);
      throw new Error(`Unsupported function: ${expression.name}`);
    }
    default: throw new Error(`Unsupported expression node: ${expression.type}`);
  }
}

export function expressionSize(expression) {
  switch (expression.type) {
    case 'sum': return 1 + expression.terms.reduce((n, term) => n + expressionSize(term), 0);
    case 'product': return 1 + expression.factors.reduce((n, factor) => n + expressionSize(factor), 0);
    case 'power': return 1 + expressionSize(expression.base);
    case 'function': return 1 + expressionSize(expression.argument);
    default: return 1;
  }
}
