import { constant, sum, product, power, func, variable, expandExpression, expressionToLatex, evaluateExpression } from './expression-model.js';

const isConst = (node, value = null) => node.type === 'constant' && (value === null || Number(node.value) === value);

export function simplifyExpression(expression) {
  switch (expression.type) {
    case 'constant': return constant(Number(expression.value));
    case 'variable': return variable(expression.name);
    case 'ref': return { ...expression };
    case 'sum': {
      const terms = expression.terms.map(simplifyExpression).flatMap(term => term.type === 'sum' ? term.terms : [term]);
      let constantTotal = 0;
      const others = [];
      for (const term of terms) {
        if (isConst(term)) constantTotal += Number(term.value);
        else others.push(term);
      }
      if (Math.abs(constantTotal) > 1e-12) others.push(constant(constantTotal));
      if (!others.length) return constant(0);
      if (others.length === 1) return others[0];
      return sum(others);
    }
    case 'product': {
      const factors = expression.factors.map(simplifyExpression).flatMap(factor => factor.type === 'product' ? factor.factors : [factor]);
      if (factors.some(factor => isConst(factor, 0))) return constant(0);
      let constantProduct = 1;
      const others = [];
      for (const factor of factors) {
        if (isConst(factor)) constantProduct *= Number(factor.value);
        else others.push(factor);
      }
      if (Math.abs(constantProduct) < 1e-12) return constant(0);
      if (Math.abs(constantProduct - 1) > 1e-12 || !others.length) others.unshift(constant(constantProduct));
      const filtered = others.filter((factor, index) => !(isConst(factor, 1) && others.length > 1 && index === 0));
      if (!filtered.length) return constant(1);
      if (filtered.length === 1) return filtered[0];
      return product(filtered);
    }
    case 'power': {
      const base = simplifyExpression(expression.base);
      if (expression.exponent === 0) return constant(1);
      if (expression.exponent === 1) return base;
      if (isConst(base)) return constant(Math.pow(Number(base.value), expression.exponent));
      return power(base, expression.exponent);
    }
    case 'function': return func(expression.name, simplifyExpression(expression.argument));
    case 'relu-derivative': return { type: 'relu-derivative', argument: simplifyExpression(expression.argument) };
    default: throw new Error(`Unsupported node in simplifier: ${expression.type}`);
  }
}

export function differentiateExpression(expression, variableName, context = {}) {
  const expanded = expandExpression(expression, context);
  return simplifyExpression(differentiateExpanded(expanded, variableName));
}

function differentiateExpanded(expression, variableName) {
  switch (expression.type) {
    case 'constant': return constant(0);
    case 'variable': return constant(expression.name === variableName ? 1 : 0);
    case 'sum': return sum(expression.terms.map(term => differentiateExpanded(term, variableName)));
    case 'product': {
      const terms = expression.factors.map((_, index) => product(expression.factors.map((factor, innerIndex) => innerIndex === index ? differentiateExpanded(factor, variableName) : factor)));
      return sum(terms);
    }
    case 'power': return product(constant(expression.exponent), power(expression.base, expression.exponent - 1), differentiateExpanded(expression.base, variableName));
    case 'function': {
      const innerDerivative = differentiateExpanded(expression.argument, variableName);
      switch (expression.name) {
        case 'sin': return product(func('cos', expression.argument), innerDerivative);
        case 'cos': return product(constant(-1), func('sin', expression.argument), innerDerivative);
        case 'exp': return product(func('exp', expression.argument), innerDerivative);
        case 'tanh': return product(sum(constant(1), product(constant(-1), power(func('tanh', expression.argument), 2))), innerDerivative);
        case 'sigmoid': {
          const sigma = func('sigmoid', expression.argument);
          return product(sigma, sum(constant(1), product(constant(-1), sigma)), innerDerivative);
        }
        case 'relu': return product({ type: 'relu-derivative', argument: expression.argument }, innerDerivative);
        default: throw new Error(`Unsupported derivative function: ${expression.name}`);
      }
    }
    case 'relu-derivative': return constant(0);
    default: throw new Error(`Unsupported node in derivative: ${expression.type}`);
  }
}

export function derivativeToLatex(expression) {
  if (expression.type === 'relu-derivative') return `\\operatorname{ReLU}'\\left(${expressionToLatex(expression.argument)}\\right)`;
  if (expression.type === 'sum') return expression.terms.map(derivativeToLatex).join(' + ').replace(/\+ -/g, '- ');
  if (expression.type === 'product') return expression.factors.map(factor => {
    const latex = derivativeToLatex(factor);
    return factor.type === 'sum' ? `\\left(${latex}\\right)` : latex;
  }).join('\\,');
  if (expression.type === 'power') return `${derivativeToLatex(expression.base)}^{${expression.exponent}}`;
  if (expression.type === 'function') return expressionToLatex(expression);
  return expressionToLatex(expression);
}

export function buildSymbolicJacobian(outputs, inputs, context = {}) {
  return outputs.map(output => inputs.map(input => derivativeToLatex(differentiateExpression(output.expressionAst, input.name, context))));
}

export function evaluateDerivative(expression, variableName, values, context = {}) {
  const derivative = differentiateExpression(expression, variableName, context);
  if (containsReluDerivative(derivative)) return evaluateDerivativeWithRelu(derivative, values, context);
  return evaluateExpression(derivative, values, context);
}

function containsReluDerivative(node) {
  if (node.type === 'relu-derivative') return true;
  if (node.type === 'sum') return node.terms.some(containsReluDerivative);
  if (node.type === 'product') return node.factors.some(containsReluDerivative);
  if (node.type === 'power') return containsReluDerivative(node.base);
  if (node.type === 'function') return containsReluDerivative(node.argument);
  return false;
}

function evaluateDerivativeWithRelu(node, values, context) {
  switch (node.type) {
    case 'relu-derivative': {
      const value = evaluateExpression(node.argument, values, context);
      if (value === 0) return 0; // Chosen convention for this game.
      return value > 0 ? 1 : 0;
    }
    case 'constant': return Number(node.value);
    case 'variable': return Number(values[node.name]);
    case 'sum': return node.terms.reduce((total, term) => total + evaluateDerivativeWithRelu(term, values, context), 0);
    case 'product': return node.factors.reduce((total, factor) => total * evaluateDerivativeWithRelu(factor, values, context), 1);
    case 'power': return Math.pow(evaluateDerivativeWithRelu(node.base, values, context), node.exponent);
    case 'function': return evaluateExpression(node, values, context);
    default: throw new Error(`Cannot evaluate derivative node ${node.type}`);
  }
}

export function finiteDifference(expression, variableName, values, context = {}, epsilon = 1e-5) {
  const plus = { ...values, [variableName]: Number(values[variableName]) + epsilon };
  const minus = { ...values, [variableName]: Number(values[variableName]) - epsilon };
  return (evaluateExpression(expression, plus, context) - evaluateExpression(expression, minus, context)) / (2 * epsilon);
}
