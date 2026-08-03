import { constant, variable, dependentVariable, derivativeSymbol, sum, product, power, fn } from './expression-model.js';
import { dependsOn } from './dependency-analysis.js';
import { simplifyExpression } from './expression-simplifier.js';

export function deriveExpression(expression, variableName, context = {}) {
  const raw = derive(expression, variableName, context);
  return simplifyExpression(raw);
}

function derive(expression, variableName, context) {
  switch (expression.type) {
    case 'constant': return constant(0);
    case 'variable': {
      if (expression.name === variableName) return constant(1);
      const declared = context.dependencies?.[expression.name] || [];
      return declared.includes(variableName)
        ? derivativeSymbol(expression.name, variableName)
        : constant(0);
    }
    case 'dependent-variable':
      if (expression.name === variableName) return constant(1);
      return expression.dependsOn.includes(variableName)
        ? derivativeSymbol(expression.name, variableName)
        : constant(0);
    case 'derivative-symbol': return constant(0);
    case 'sum': return sum(...expression.terms.map((term) => derive(term, variableName, context)));
    case 'product': {
      const terms = expression.factors.map((factor, index) => {
        const derivativeFactor = derive(factor, variableName, context);
        const otherFactors = expression.factors.map((candidate, i) => i === index ? derivativeFactor : candidate);
        return product(...otherFactors);
      });
      return sum(...terms);
    }
    case 'power': {
      const innerDerivative = derive(expression.base, variableName, context);
      return product(constant(expression.exponent), power(expression.base, expression.exponent - 1), innerDerivative);
    }
    case 'function': {
      const innerDerivative = derive(expression.argument, variableName, context);
      if (expression.name === 'sin') return product(fn('cos', expression.argument), innerDerivative);
      if (expression.name === 'cos') return product(constant(-1), fn('sin', expression.argument), innerDerivative);
      if (expression.name === 'exp') return product(fn('exp', expression.argument), innerDerivative);
      throw new Error(`Unsupported function derivative: ${expression.name}`);
    }
    default:
      throw new Error(`Unsupported derivative node: ${expression.type}`);
  }
}

export function derivativeTrace(expression, variableName, context = {}) {
  const derivative = deriveExpression(expression, variableName, context);
  return {
    derivative,
    depends: dependsOn(expression, variableName, context),
    steps: buildTraceSteps(expression, variableName, context)
  };
}

function buildTraceSteps(expression, variableName, context) {
  if (!dependsOn(expression, variableName, context)) {
    return [`The expression has no dependency on ${variableName}, so its derivative is 0.`];
  }
  if (expression.type === 'sum') {
    return [
      'Apply the sum rule and differentiate each term separately.',
      ...expression.terms.map((term) => dependsOn(term, variableName, context)
        ? `The term depends on ${variableName}, so differentiate it.`
        : `The term is independent of ${variableName}, so it contributes 0.`)
    ];
  }
  if (expression.type === 'product') {
    const frozen = expression.factors.filter((factor) => !dependsOn(factor, variableName, context));
    if (frozen.length) return ['Preserve factors that are constant with respect to the active variable.', 'Differentiate the factor or factors that depend on the active variable.'];
    return ['All relevant factors depend on the active variable, so apply the product rule.'];
  }
  if (expression.type === 'function' || expression.type === 'power') return ['Differentiate the outer expression, then multiply by the derivative of the inner expression.'];
  return ['Apply the local derivative rule.'];
}

export const dsl = { constant, variable, dependentVariable, derivativeSymbol, sum, product, power, fn };
