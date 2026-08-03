import { collectVariables, evaluate, parseExpression, simplify, stableKey } from './ast.js';

export function equivalentExpressions(left, right, options = {}) {
  const a = typeof left === 'string' ? parseExpression(left) : simplify(left);
  const b = typeof right === 'string' ? parseExpression(right) : simplify(right);
  if (stableKey(a) === stableKey(b)) return { equivalent: true, method: 'canonical' };

  const variables = [...new Set([...collectVariables(a), ...collectVariables(b)])].sort();
  const points = options.points || [-2.3, -1.1, -0.4, 0.7, 1.6, 2.8, 4.1];
  let successfulChecks = 0;
  for (let index = 0; index < points.length; index += 1) {
    const scope = {};
    variables.forEach((name, variableIndex) => {
      scope[name] = points[(index + variableIndex * 2) % points.length];
    });
    try {
      const av = evaluate(a, scope);
      const bv = evaluate(b, scope);
      if (!Number.isFinite(av) || !Number.isFinite(bv)) continue;
      successfulChecks += 1;
      const tolerance = 1e-8 * Math.max(1, Math.abs(av), Math.abs(bv));
      if (Math.abs(av - bv) > tolerance) return { equivalent: false, method: 'numeric-counterexample', scope, leftValue: av, rightValue: bv };
    } catch {
      // Skip invalid points; enough independent valid checks are required below.
    }
  }
  return { equivalent: successfulChecks >= 5, method: successfulChecks >= 5 ? 'numeric-spot-checks' : 'insufficient-valid-checks' };
}

export function safeParse(input) {
  if (!String(input).trim()) return { ok: false, error: 'Enter a derivative expression before applying it.' };
  try {
    const ast = parseExpression(input);
    return { ok: true, ast };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid expression.' };
  }
}
