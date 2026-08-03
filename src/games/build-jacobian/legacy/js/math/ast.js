export const c = value => ({ type: 'const', value: Number(value) });
export const v = name => ({ type: 'var', name });
export const add = (...terms) => ({ type: 'add', terms: terms.flat() });
export const mul = (...factors) => ({ type: 'mul', factors: factors.flat() });
export const pow = (base, exponent) => ({ type: 'pow', base, exponent: Number(exponent) });
export const sin = arg => ({ type: 'sin', arg });
export const cos = arg => ({ type: 'cos', arg });
export const exp = arg => ({ type: 'exp', arg });
export const relu = arg => ({ type: 'relu', arg });

export function cloneAst(node) {
  return JSON.parse(JSON.stringify(node));
}

export function stableKey(node) {
  const n = simplify(node);
  switch (n.type) {
    case 'const': return `c:${normalizeNumber(n.value)}`;
    case 'var': return `v:${n.name}`;
    case 'add': return `a:${n.terms.map(stableKey).sort().join('|')}`;
    case 'mul': return `m:${n.factors.map(stableKey).sort().join('|')}`;
    case 'pow': return `p:${stableKey(n.base)}:${n.exponent}`;
    case 'sin': case 'cos': case 'exp': case 'relu': return `${n.type}:${stableKey(n.arg)}`;
    case 'reluDerivative': return `reluDerivative:${stableKey(n.arg)}:${n.convention ?? 0}`;
    default: throw new Error(`Unknown AST node type: ${n.type}`);
  }
}

function normalizeNumber(value) {
  return Object.is(value, -0) ? 0 : Number(value.toFixed(12));
}

export function containsVariable(node, variableName) {
  switch (node.type) {
    case 'const': return false;
    case 'var': return node.name === variableName;
    case 'add': return node.terms.some(term => containsVariable(term, variableName));
    case 'mul': return node.factors.some(factor => containsVariable(factor, variableName));
    case 'pow': return containsVariable(node.base, variableName);
    case 'sin': case 'cos': case 'exp': case 'relu': case 'reluDerivative': return containsVariable(node.arg, variableName);
    default: return false;
  }
}

export function collectVariables(node, target = new Set()) {
  switch (node.type) {
    case 'var': target.add(node.name); break;
    case 'add': node.terms.forEach(term => collectVariables(term, target)); break;
    case 'mul': node.factors.forEach(factor => collectVariables(factor, target)); break;
    case 'pow': collectVariables(node.base, target); break;
    case 'sin': case 'cos': case 'exp': case 'relu': case 'reluDerivative': collectVariables(node.arg, target); break;
    default: break;
  }
  return target;
}

function coefficientAndBase(term) {
  const t = simplify(term);
  if (t.type === 'const') return { coefficient: t.value, base: null };
  if (t.type === 'mul' && t.factors[0]?.type === 'const') {
    const coefficient = t.factors[0].value;
    const rest = t.factors.slice(1);
    return { coefficient, base: rest.length === 1 ? rest[0] : { type: 'mul', factors: rest } };
  }
  return { coefficient: 1, base: t };
}

export function simplify(node) {
  if (!node || typeof node !== 'object') throw new TypeError('AST node must be an object.');
  switch (node.type) {
    case 'const': return c(normalizeNumber(node.value));
    case 'var': return v(node.name);
    case 'add': {
      const flattened = node.terms.flatMap(term => {
        const simplified = simplify(term);
        return simplified.type === 'add' ? simplified.terms : [simplified];
      });
      const groups = new Map();
      let constant = 0;
      for (const term of flattened) {
        const { coefficient, base } = coefficientAndBase(term);
        if (!base) constant += coefficient;
        else {
          const key = stableKeyNoSimplify(base);
          const current = groups.get(key) || { base, coefficient: 0 };
          current.coefficient += coefficient;
          groups.set(key, current);
        }
      }
      const terms = [];
      for (const { base, coefficient } of [...groups.values()].sort((a, b) => stableKeyNoSimplify(a.base).localeCompare(stableKeyNoSimplify(b.base)))) {
        const coeff = normalizeNumber(coefficient);
        if (coeff === 0) continue;
        terms.push(coeff === 1 ? base : coeff === -1 ? simplify(mul(c(-1), base)) : simplify(mul(c(coeff), base)));
      }
      constant = normalizeNumber(constant);
      if (constant !== 0) terms.push(c(constant));
      if (terms.length === 0) return c(0);
      if (terms.length === 1) return terms[0];
      return { type: 'add', terms };
    }
    case 'mul': {
      const flattened = node.factors.flatMap(factor => {
        const simplified = simplify(factor);
        return simplified.type === 'mul' ? simplified.factors : [simplified];
      });
      let coefficient = 1;
      const powers = new Map();
      const other = [];
      for (const factor of flattened) {
        if (factor.type === 'const') {
          coefficient *= factor.value;
        } else if (factor.type === 'var') {
          powers.set(factor.name, (powers.get(factor.name) || 0) + 1);
        } else if (factor.type === 'pow' && factor.base.type === 'var' && Number.isInteger(factor.exponent)) {
          powers.set(factor.base.name, (powers.get(factor.base.name) || 0) + factor.exponent);
        } else {
          other.push(factor);
        }
      }
      coefficient = normalizeNumber(coefficient);
      if (coefficient === 0) return c(0);
      const factors = [];
      if (coefficient !== 1 || (powers.size === 0 && other.length === 0)) factors.push(c(coefficient));
      for (const [name, exponent] of [...powers.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (exponent === 0) continue;
        factors.push(exponent === 1 ? v(name) : pow(v(name), exponent));
      }
      other.sort((a, b) => stableKeyNoSimplify(a).localeCompare(stableKeyNoSimplify(b)));
      factors.push(...other);
      if (factors.length === 0) return c(1);
      if (factors.length === 1) return factors[0];
      return { type: 'mul', factors };
    }
    case 'pow': {
      const base = simplify(node.base);
      const exponent = Number(node.exponent);
      if (exponent === 0) return c(1);
      if (exponent === 1) return base;
      if (base.type === 'const') return c(Math.pow(base.value, exponent));
      return { type: 'pow', base, exponent };
    }
    case 'reluDerivative': {
      const arg = simplify(node.arg);
      return { type: 'reluDerivative', arg, convention: Number(node.convention ?? 0) };
    }
    case 'sin': case 'cos': case 'exp': case 'relu': {
      const arg = simplify(node.arg);
      if (arg.type === 'const') {
        if (node.type === 'sin') return c(Math.sin(arg.value));
        if (node.type === 'cos') return c(Math.cos(arg.value));
        if (node.type === 'exp') return c(Math.exp(arg.value));
        return c(Math.max(0, arg.value));
      }
      return { type: node.type, arg };
    }
    default: throw new Error(`Unknown AST node type: ${node.type}`);
  }
}

function stableKeyNoSimplify(node) {
  switch (node.type) {
    case 'const': return `c:${normalizeNumber(node.value)}`;
    case 'var': return `v:${node.name}`;
    case 'add': return `a:${node.terms.map(stableKeyNoSimplify).sort().join('|')}`;
    case 'mul': return `m:${node.factors.map(stableKeyNoSimplify).sort().join('|')}`;
    case 'pow': return `p:${stableKeyNoSimplify(node.base)}:${node.exponent}`;
    case 'sin': case 'cos': case 'exp': case 'relu': return `${node.type}:${stableKeyNoSimplify(node.arg)}`;
    case 'reluDerivative': return `reluDerivative:${stableKeyNoSimplify(node.arg)}:${node.convention ?? 0}`;
    default: return JSON.stringify(node);
  }
}

export function evaluate(node, scope = {}, context = {}) {
  switch (node.type) {
    case 'const': return node.value;
    case 'var': {
      if (!Object.prototype.hasOwnProperty.call(scope, node.name)) throw new Error(`Missing value for ${node.name}`);
      const value = Number(scope[node.name]);
      if (!Number.isFinite(value)) throw new Error(`Invalid value for ${node.name}`);
      return value;
    }
    case 'add': return node.terms.reduce((sum, term) => sum + evaluate(term, scope, context), 0);
    case 'mul': return node.factors.reduce((product, factor) => product * evaluate(factor, scope, context), 1);
    case 'pow': return Math.pow(evaluate(node.base, scope, context), node.exponent);
    case 'sin': return Math.sin(evaluate(node.arg, scope, context));
    case 'cos': return Math.cos(evaluate(node.arg, scope, context));
    case 'exp': return Math.exp(evaluate(node.arg, scope, context));
    case 'relu': return Math.max(0, evaluate(node.arg, scope, context));
    case 'reluDerivative': {
      const value = evaluate(node.arg, scope, context);
      return value > 0 ? 1 : value < 0 ? 0 : Number(node.convention ?? context.reluDerivativeAtZero ?? 0);
    }
    default: throw new Error(`Unknown AST node type: ${node.type}`);
  }
}

function precedence(node) {
  if (node.type === 'add') return 1;
  if (node.type === 'mul') return 2;
  if (node.type === 'pow') return 3;
  return 4;
}

function wrapLatex(node, parentPrecedence) {
  const rendered = toLatex(node);
  return precedence(node) < parentPrecedence ? `\\left(${rendered}\\right)` : rendered;
}

export function toLatex(node) {
  const n = simplify(node);
  switch (n.type) {
    case 'const': return String(normalizeNumber(n.value));
    case 'var': {
      const match = n.name.match(/^([A-Za-z]+)_([A-Za-z0-9]+)$/);
      return match ? `${match[1]}_{${match[2]}}` : n.name.replace(/_/g, '\\_');
    }
    case 'add': {
      return n.terms.map((term, index) => {
        const text = wrapLatex(term, 1);
        if (index > 0 && term.type === 'mul' && term.factors[0]?.type === 'const' && term.factors[0].value < 0) return text;
        if (index > 0 && term.type === 'const' && term.value < 0) return text;
        return index === 0 ? text : `+${text}`;
      }).join('');
    }
    case 'mul': {
      const [first, ...rest] = n.factors;
      const parts = [wrapLatex(first, 2), ...rest.map(factor => wrapLatex(factor, 2))];
      return parts.join('\\,');
    }
    case 'pow': return `${wrapLatex(n.base, 3)}^{${n.exponent}}`;
    case 'reluDerivative': return `\\operatorname{ReLU}'\\left(${toLatex(n.arg)}\\right)`;
    case 'sin': return `\\sin\\left(${toLatex(n.arg)}\\right)`;
    case 'cos': return `\\cos\\left(${toLatex(n.arg)}\\right)`;
    case 'exp': return `e^{${toLatex(n.arg)}}`;
    case 'relu': return `\\operatorname{ReLU}\\left(${toLatex(n.arg)}\\right)`;
    default: return '?';
  }
}

export function toPlain(node) {
  const n = simplify(node);
  switch (n.type) {
    case 'const': return String(normalizeNumber(n.value));
    case 'var': return n.name;
    case 'add': return n.terms.map((term, index) => {
      const text = toPlain(term);
      const negative = (term.type === 'const' && term.value < 0) || (term.type === 'mul' && term.factors[0]?.type === 'const' && term.factors[0].value < 0);
      return index === 0 || negative ? text : `+${text}`;
    }).join('');
    case 'mul': return n.factors.map(factor => precedence(factor) < 2 ? `(${toPlain(factor)})` : toPlain(factor)).join('*');
    case 'pow': return `${precedence(n.base) < 3 ? `(${toPlain(n.base)})` : toPlain(n.base)}^${n.exponent}`;
    case 'sin': case 'cos': case 'exp': case 'relu': return `${n.type}(${toPlain(n.arg)})`;
    case 'reluDerivative': return `reluDerivative(${toPlain(n.arg)})`;
    default: return '?';
  }
}

function tokenize(input) {
  const normalized = String(input).replace(/−/g, '-').replace(/\s+/g, '');
  const tokens = [];
  let index = 0;
  while (index < normalized.length) {
    const ch = normalized[index];
    if ('+-*^(),'.includes(ch)) { tokens.push({ type: ch, value: ch }); index += 1; continue; }
    const number = normalized.slice(index).match(/^\d+(?:\.\d+)?/);
    if (number) { tokens.push({ type: 'number', value: number[0] }); index += number[0].length; continue; }
    const identifier = normalized.slice(index).match(/^(?:[A-Za-z]+_[0-9]+|[A-Za-z][A-Za-z0-9_]*)/);
    if (identifier) { tokens.push({ type: 'id', value: identifier[0] }); index += identifier[0].length; continue; }
    throw new Error(`Unsupported symbol '${ch}'.`);
  }
  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

export function parseExpression(input) {
  const tokens = tokenize(input);
  let position = 0;
  const peek = () => tokens[position];
  const consume = type => {
    const token = peek();
    if (token.type !== type) throw new Error(`Expected '${type}' but found '${token.value || token.type}'.`);
    position += 1;
    return token;
  };
  const startsFactor = token => token.type === 'number' || token.type === 'id' || token.type === '(';

  function parsePrimary() {
    const token = peek();
    if (token.type === 'number') { position += 1; return c(token.value); }
    if (token.type === 'id') {
      position += 1;
      const name = token.value.toLowerCase();
      if (['sin', 'cos', 'exp', 'relu'].includes(name) && peek().type === '(') {
        consume('(');
        const arg = parseAdditive();
        consume(')');
        return ({ sin, cos, exp, relu })[name](arg);
      }
      return v(token.value);
    }
    if (token.type === '(') {
      consume('(');
      const value = parseAdditive();
      consume(')');
      return value;
    }
    throw new Error(`Unexpected token '${token.value || token.type}'.`);
  }

  function parseUnary() {
    if (peek().type === '+') { consume('+'); return parseUnary(); }
    if (peek().type === '-') { consume('-'); return mul(c(-1), parseUnary()); }
    return parsePrimary();
  }

  function parsePower() {
    let base = parseUnary();
    if (peek().type === '^') {
      consume('^');
      const sign = peek().type === '-' ? (consume('-'), -1) : 1;
      const exponentToken = consume('number');
      base = pow(base, sign * Number(exponentToken.value));
    }
    return base;
  }

  function parseMultiplicative() {
    const factors = [parsePower()];
    while (peek().type === '*' || startsFactor(peek())) {
      if (peek().type === '*') consume('*');
      factors.push(parsePower());
    }
    return factors.length === 1 ? factors[0] : mul(...factors);
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (peek().type === '+' || peek().type === '-') {
      const operation = peek().type;
      position += 1;
      const right = parseMultiplicative();
      node = operation === '+' ? add(node, right) : add(node, mul(c(-1), right));
    }
    return node;
  }

  const result = simplify(parseAdditive());
  if (peek().type !== 'eof') throw new Error(`Unexpected token '${peek().value}'.`);
  return result;
}
