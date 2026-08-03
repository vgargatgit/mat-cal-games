import { expressionsEquivalent, parseExpression } from '../math/expression-validator.js';
import { MISCONCEPTIONS } from '../data/misconceptions.js';
import { collectVariables, evaluateExpression } from '../math/expression-model.js';
import { deriveExpression } from '../math/symbolic-derivative.js';

export function validateRoundAnswer(round, answer) {
  if (round.taskKind === 'gradient') return validateGradient(round, answer);
  if (round.taskKind === 'bug-hunter') return validateBugHunter(round, answer);

  const checks = {
    shape: answer.shape === round.expectedAnswer.shape.semanticType,
    activeVariable: answer.activeVariable === round.expectedAnswer.activeVariable,
    frozenVariables: sameSet(answer.frozenVariables || [], round.expectedAnswer.frozenVariables || []),
    dependencies: validateDependencies(round, answer.termDependencies || {}),
    rules: validateRules(round, answer.selectedRules || []),
    derivative: false
  };

  let parseError = null;
  try {
    checks.derivative = expressionsEquivalent(round.expectedAnswer.derivativeAst, answer.finalExpression || '');
  } catch (error) {
    parseError = error.message;
  }

  const misconceptions = diagnose(round, answer, checks);
  return {
    correct: Object.values(checks).every(Boolean),
    checks,
    misconceptions,
    parseError,
    score: scoreChecks(checks, answer),
    feedback: buildFeedback(round, checks, misconceptions, parseError)
  };
}

function validateGradient(round, answer) {
  const checks = {
    shape: answer.shape === 'row-vector',
    activeVariable: true,
    frozenVariables: true,
    dependencies: true,
    rules: true,
    derivative: false
  };
  const components = answer.gradientComponents || [];
  try {
    checks.derivative = components.length === round.expectedAnswer.components.length && components.every((candidate, index) => expressionsEquivalent(round.expectedAnswer.components[index], candidate));
  } catch {
    checks.derivative = false;
  }
  const misconceptions = [];
  if (!checks.shape) misconceptions.push('incorrect-shape');
  if (!checks.derivative) misconceptions.push('incorrect-final-expression');
  return { correct: checks.shape && checks.derivative, checks, misconceptions, parseError: null, score: scoreChecks(checks, answer), feedback: buildFeedback(round, checks, misconceptions, null) };
}

function validateBugHunter(round, answer) {
  const checks = {
    shape: answer.shape === 'scalar',
    activeVariable: answer.activeVariable === round.activeVariable,
    frozenVariables: sameSet(answer.frozenVariables || [], round.expectedAnswer.frozenVariables || []),
    dependencies: true,
    rules: true,
    derivative: Number(answer.firstIncorrectIndex) === round.firstIncorrectIndex
  };
  if (answer.finalExpression) {
    try { checks.derivative = checks.derivative && expressionsEquivalent(round.expectedAnswer.derivativeAst, answer.finalExpression); } catch { checks.derivative = false; }
  }
  const misconceptions = checks.derivative ? [] : ['removed-frozen-multiplier'];
  return { correct: Object.values(checks).every(Boolean), checks, misconceptions, parseError: null, score: scoreChecks(checks, answer), feedback: buildFeedback(round, checks, misconceptions, null) };
}

function validateDependencies(round, submitted) {
  return (round.expectedAnswer.termDependencies || []).every((term, index) => Boolean(submitted[index]) === term.dependsOnActiveVariable);
}

function validateRules(round, selectedRules) {
  if (!round.rules?.length) return true;
  const requiredCore = round.rules.filter((rule) => !['identity'].includes(rule));
  return requiredCore.every((rule) => selectedRules.includes(rule));
}

function diagnose(round, answer, checks) {
  const issues = [];
  if (!checks.shape) issues.push('incorrect-shape');
  if (!checks.activeVariable) issues.push('wrong-active-variable');
  if (!checks.frozenVariables) {
    const dependentNames = round.variables.filter((item) => item.role === 'dependent').map((item) => item.name);
    if ((answer.frozenVariables || []).some((name) => dependentNames.includes(name))) issues.push('ignored-declared-dependency');
    else issues.push('partial-total-confusion');
  }
  if (!checks.dependencies) {
    const expectedTerms = round.expectedAnswer.termDependencies || [];
    const frozeMixed = expectedTerms.some((term, index) => term.kind === 'mixed' && !answer.termDependencies?.[index]);
    const differentiatedIndependent = expectedTerms.some((term, index) => !term.dependsOnActiveVariable && answer.termDependencies?.[index]);
    if (frozeMixed) issues.push('froze-mixed-term');
    if (differentiatedIndependent) issues.push('differentiated-independent-variable');
  }
  if (!checks.derivative && answer.finalExpression) {
    const expectedHasFrozenSymbol = (round.expectedAnswer.frozenVariables || []).some((name) => containsVariable(round.expectedAnswer.derivativeAst, name));
    const candidateText = String(answer.finalExpression).replace(/\s+/g, '');
    const omittedFrozen = expectedHasFrozenSymbol && (round.expectedAnswer.frozenVariables || []).some((name) => !candidateText.includes(name));
    if (omittedFrozen) issues.push('removed-frozen-multiplier');
    else if (round.derivativeType === 'total' && candidateText && !candidateText.includes('d')) issues.push('ignored-declared-dependency');
    else if (round.rules?.includes('chain') && !candidateLooksChainComplete(round, answer.finalExpression)) issues.push('missed-chain-factor');
    else issues.push('incorrect-final-expression');
  }
  return [...new Set(issues)];
}

function candidateLooksChainComplete(round, candidate) {
  try {
    const ast = parseExpression(candidate);
    const variables = [...collectVariables(ast).keys()];
    return round.expectedAnswer.frozenVariables.every((name) => !containsVariable(round.expectedAnswer.derivativeAst, name) || variables.includes(name));
  } catch {
    return false;
  }
}

function containsVariable(expression, name) {
  if (!expression) return false;
  if (['variable', 'dependent-variable'].includes(expression.type)) return expression.name === name;
  if (expression.type === 'sum') return expression.terms.some((term) => containsVariable(term, name));
  if (expression.type === 'product') return expression.factors.some((factor) => containsVariable(factor, name));
  if (expression.type === 'power') return containsVariable(expression.base, name);
  if (expression.type === 'function') return containsVariable(expression.argument, name);
  return false;
}

function sameSet(a, b) {
  return a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

function scoreChecks(checks, answer) {
  const weights = { shape: 10, activeVariable: 15, frozenVariables: 20, dependencies: 20, rules: 20, derivative: 35 };
  let score = Object.entries(weights).reduce((total, [key, value]) => total + (checks[key] ? value : 0), 0);
  if ((answer.hintsUsed || 0) === 0) score += 10;
  if ((answer.attemptNumber || 1) === 1) score += 20;
  return score;
}

function buildFeedback(round, checks, misconceptions, parseError) {
  if (Object.values(checks).every(Boolean)) {
    const frozen = round.expectedAnswer.frozenVariables || [];
    return {
      title: 'Dependency reasoning is consistent',
      message: `${round.activeVariable || round.expectedAnswer.activeVariable} is active${frozen.length ? ` and ${frozen.join(', ')} ${frozen.length === 1 ? 'is' : 'are'} frozen` : ''}. The final expression matches the derivative implied by those dependencies.`,
      details: round.explanation || []
    };
  }
  const first = misconceptions[0] || 'incorrect-final-expression';
  return {
    title: MISCONCEPTIONS[first]?.title || 'Review the first inconsistent step',
    message: parseError ? `The derivative expression could not be parsed: ${parseError}` : (MISCONCEPTIONS[first]?.feedback || 'One or more reasoning stages do not match the dependency structure.'),
    details: misconceptions.slice(1).map((id) => MISCONCEPTIONS[id]?.feedback).filter(Boolean)
  };
}

export function finiteDifferenceCheck(round, environment = {}, epsilon = 1e-5, tolerance = 1e-4) {
  if (round.taskKind !== 'standard') return { skipped: true, reason: 'Non-scalar task' };
  const active = round.activeVariable;
  if (round.variables.some((item) => item.role === 'dependent')) return { skipped: true, reason: 'Declared dependency requires an explicit dependency function' };
  const base = { ...environment };
  round.variables.forEach((item, index) => { if (base[item.name] === undefined) base[item.name] = 0.7 + index * 0.8; });
  const plus = { ...base, [active]: base[active] + epsilon };
  const minus = { ...base, [active]: base[active] - epsilon };
  const numeric = (evaluateExpression(round.expression, plus) - evaluateExpression(round.expression, minus)) / (2 * epsilon);
  const symbolic = evaluateExpression(deriveExpression(round.expression, active, round.context), base);
  const error = Math.abs(numeric - symbolic);
  return { skipped: false, passed: error <= tolerance * Math.max(1, Math.abs(symbolic)), numeric, symbolic, error };
}
