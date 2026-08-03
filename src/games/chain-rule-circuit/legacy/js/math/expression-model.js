export const variable = name => ({ type: 'variable', name });
export const constant = value => ({ type: 'constant', value });
export const unary = (operation, argument) => ({ type: 'unary', operation, argument });
export const binary = (operation, left, right) => ({ type: 'binary', operation, left, right });

export function evaluateExpression(ast, environment = {}) {
  if (ast.type === 'constant') return ast.value;
  if (ast.type === 'variable') {
    if (!(ast.name in environment)) throw new ReferenceError(`Missing value for ${ast.name}.`);
    return environment[ast.name];
  }
  if (ast.type === 'unary') {
    const value = evaluateExpression(ast.argument, environment);
    const operations = {
      square: x => x * x,
      exp: Math.exp,
      sin: Math.sin,
      cos: Math.cos,
      tanh: Math.tanh,
      sigmoid: x => 1 / (1 + Math.exp(-x)),
      relu: x => Math.max(0, x),
      identity: x => x
    };
    if (!operations[ast.operation]) throw new Error(`Unsupported unary operation ${ast.operation}.`);
    return operations[ast.operation](value);
  }
  if (ast.type === 'binary') {
    const left = evaluateExpression(ast.left, environment);
    const right = evaluateExpression(ast.right, environment);
    const operations = { add: (a, b) => a + b, subtract: (a, b) => a - b, multiply: (a, b) => a * b, divide: (a, b) => a / b, power: (a, b) => a ** b };
    if (!operations[ast.operation]) throw new Error(`Unsupported binary operation ${ast.operation}.`);
    if (ast.operation === 'divide' && Math.abs(right) < 1e-12) throw new RangeError('Unsafe division by zero.');
    return operations[ast.operation](left, right);
  }
  throw new TypeError('Unknown expression node.');
}

export function expressionToText(ast) {
  if (ast.type === 'constant') return String(ast.value);
  if (ast.type === 'variable') return ast.name;
  if (ast.type === 'unary') {
    if (ast.operation === 'square') return `(${expressionToText(ast.argument)})^2`;
    return `${ast.operation}(${expressionToText(ast.argument)})`;
  }
  const symbol = { add: '+', subtract: '-', multiply: '*', divide: '/', power: '^' }[ast.operation];
  return `(${expressionToText(ast.left)}${symbol}${expressionToText(ast.right)})`;
}

export function decomposeExpression(ast, strategy = 'inside-out') {
  if (strategy !== 'inside-out') throw new Error('Only inside-out decomposition is supported.');
  const steps = [];
  let counter = 0;
  function visit(node, isRoot = false) {
    if (node.type === 'variable' || node.type === 'constant') return expressionToText(node);
    const built = node.type === 'unary'
      ? { ...node, argument: variable(visit(node.argument)) }
      : { ...node, left: variable(visit(node.left)), right: variable(visit(node.right)) };
    const name = isRoot ? 'y' : ['u', 'v', 'w', 'q'][counter++] ?? `t${counter}`;
    steps.push({ name, expression: expressionToText(built), ast: built });
    return name;
  }
  visit(ast, true);
  return steps;
}
