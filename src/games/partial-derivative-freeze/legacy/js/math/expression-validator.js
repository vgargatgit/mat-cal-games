import { constant, variable, sum, product, power, fn, derivativeSymbol, evaluateExpression, collectVariables } from './expression-model.js';
import { canonicalExpression, simplifyExpression } from './expression-simplifier.js';

const FUNCTION_NAMES = new Set(['sin', 'cos', 'exp']);

export function parseExpression(input) {
  const normalized = preprocess(input);
  const tokens = insertImplicitMultiplication(tokenize(normalized));
  let position = 0;

  const peek = () => tokens[position];
  const consume = (type, value = null) => {
    const token = tokens[position];
    if (!token || token.type !== type || (value !== null && token.value !== value)) {
      throw new Error(`Expected ${value ?? type}`);
    }
    position += 1;
    return token;
  };

  function parseAdditive() {
    let node = parseMultiplicative();
    const terms = [node];
    while (peek()?.type === 'operator' && ['+', '-'].includes(peek().value)) {
      const op = consume('operator').value;
      const rhs = parseMultiplicative();
      terms.push(op === '-' ? product(constant(-1), rhs) : rhs);
    }
    return terms.length === 1 ? node : sum(...terms);
  }

  function parseMultiplicative() {
    let node = parsePower();
    const factors = [node];
    while (peek()?.type === 'operator' && ['*', '/'].includes(peek().value)) {
      const op = consume('operator').value;
      const rhs = parsePower();
      if (op === '/') {
        if (rhs.type !== 'constant') throw new Error('Only division by a numerical constant is supported in answers.');
        factors.push(constant(1 / rhs.value));
      } else {
        factors.push(rhs);
      }
    }
    return factors.length === 1 ? node : product(...factors);
  }

  function parsePower() {
    let node = parseUnary();
    if (peek()?.type === 'operator' && peek().value === '^') {
      consume('operator', '^');
      const exponentToken = consume('number');
      node = power(node, Number(exponentToken.value));
    }
    return node;
  }

  function parseUnary() {
    if (peek()?.type === 'operator' && peek().value === '-') {
      consume('operator', '-');
      return product(constant(-1), parseUnary());
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Unexpected end of expression.');
    if (token.type === 'number') {
      consume('number');
      return constant(Number(token.value));
    }
    if (token.type === 'identifier') {
      consume('identifier');
      if (token.value.startsWith('D_')) {
        const [, numerator, denominator] = token.value.split('_');
        return derivativeSymbol(numerator, denominator);
      }
      if (FUNCTION_NAMES.has(token.value) && peek()?.type === 'paren' && peek().value === '(') {
        consume('paren', '(');
        const argument = parseAdditive();
        consume('paren', ')');
        return fn(token.value, argument);
      }
      return variable(token.value);
    }
    if (token.type === 'paren' && token.value === '(') {
      consume('paren', '(');
      const node = parseAdditive();
      consume('paren', ')');
      return node;
    }
    throw new Error(`Unexpected token ${token.value}`);
  }

  const result = simplifyExpression(parseAdditive());
  if (position !== tokens.length) throw new Error(`Unexpected token ${tokens[position].value}`);
  return result;
}

function preprocess(input) {
  return String(input)
    .trim()
    .replace(/\\cdot|·/g, '*')
    .replace(/\s+/g, '')
    .replace(/([d∂])([A-Za-z][A-Za-z0-9_]*)\/([d∂])([A-Za-z][A-Za-z0-9_]*)/g, 'D_$2_$4')
    .replace(/[{}]/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
}

function tokenize(input) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;
      while (index < input.length && /[0-9.]/.test(input[index])) value += input[index++];
      if (!/^\d*\.?\d+$/.test(value)) throw new Error(`Invalid number ${value}`);
      tokens.push({ type: 'number', value });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      if (input.startsWith('D_', index)) {
        let value = 'D_';
        index += 2;
        while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) value += input[index++];
        tokens.push({ type: 'identifier', value });
        continue;
      }
      const functionName = [...FUNCTION_NAMES].find((name) => input.startsWith(name, index));
      if (functionName) {
        tokens.push({ type: 'identifier', value: functionName });
        index += functionName.length;
        continue;
      }
      let value = char;
      index += 1;
      while (index < input.length && /[0-9]/.test(input[index])) value += input[index++];
      tokens.push({ type: 'identifier', value });
      continue;
    }
    if ('+-*/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }
    if ('()[]'.includes(char)) {
      tokens.push({ type: 'paren', value: char === '[' ? '(' : char === ']' ? ')' : char });
      index += 1;
      continue;
    }
    throw new Error(`Unsupported character: ${char}`);
  }
  return tokens;
}

function insertImplicitMultiplication(tokens) {
  const result = [];
  const canEnd = (token) => token && (token.type === 'number' || token.type === 'identifier' || (token.type === 'paren' && token.value === ')'));
  const canStart = (token) => token && (token.type === 'number' || token.type === 'identifier' || (token.type === 'paren' && token.value === '('));
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const previous = result[result.length - 1];
    const isFunctionCall = previous?.type === 'identifier' && FUNCTION_NAMES.has(previous.value) && current.type === 'paren' && current.value === '(';
    if (canEnd(previous) && canStart(current) && !isFunctionCall) result.push({ type: 'operator', value: '*' });
    result.push(current);
  }
  return result;
}

export function expressionsEquivalent(expected, candidate, options = {}) {
  const expectedAst = typeof expected === 'string' ? parseExpression(expected) : expected;
  const candidateAst = typeof candidate === 'string' ? parseExpression(candidate) : candidate;
  if (canonicalExpression(expectedAst) === canonicalExpression(candidateAst)) return true;
  return numericallyEquivalent(expectedAst, candidateAst, options);
}

export function numericallyEquivalent(expected, candidate, options = {}) {
  const names = new Set([
    ...collectVariables(expected).keys(),
    ...collectVariables(candidate).keys()
  ]);
  const derivativeSymbols = collectDerivativeSymbols(expected, new Set());
  collectDerivativeSymbols(candidate, derivativeSymbols);
  const points = options.points || [-2.3, -1.1, 0.7, 1.9, 3.2];
  for (let i = 0; i < points.length; i += 1) {
    const env = {};
    [...names].forEach((name, index) => { env[name] = points[(i + index) % points.length]; });
    [...derivativeSymbols].forEach((key, index) => { env[key] = points[(i + index + 2) % points.length] || 1.3; });
    const a = evaluateExpression(expected, env);
    const b = evaluateExpression(candidate, env);
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a), Math.abs(b))) return false;
  }
  return true;
}

function collectDerivativeSymbols(expression, result) {
  if (expression.type === 'derivative-symbol') result.add(`d${expression.numerator}_d${expression.denominator}`);
  if (expression.type === 'sum') expression.terms.forEach((term) => collectDerivativeSymbols(term, result));
  if (expression.type === 'product') expression.factors.forEach((factor) => collectDerivativeSymbols(factor, result));
  if (expression.type === 'power') collectDerivativeSymbols(expression.base, result);
  if (expression.type === 'function') collectDerivativeSymbols(expression.argument, result);
  return result;
}

export function validateImportedExpression(input) {
  try {
    const ast = parseExpression(input);
    return { valid: true, ast };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
