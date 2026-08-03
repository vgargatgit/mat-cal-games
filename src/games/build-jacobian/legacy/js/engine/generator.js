import { c, v, add, mul, pow, sin, exp, relu } from '../math/ast.js';
import { createRound } from '../data/rounds.js';
import { SeededRandom } from './seeded-random.js';

function variableNames(count, prefix = 'x') {
  return Array.from({ length: count }, (_, index) => `${prefix}_${index + 1}`);
}

function nonZeroCoefficient(rng) {
  let value = 0;
  while (value === 0) value = rng.int(-5, 5);
  return value;
}

function polynomialTerm(variable, rng, advanced = false) {
  const coefficient = nonZeroCoefficient(rng);
  const exponent = advanced ? rng.int(1, 3) : rng.int(1, 2);
  const base = exponent === 1 ? v(variable) : pow(v(variable), exponent);
  return coefficient === 1 ? base : mul(c(coefficient), base);
}

function buildPolynomialOutput(inputs, rng, options = {}) {
  const { dense = false, sparse = false, advanced = false } = options;
  let selected;
  if (dense) {
    selected = [...inputs];
  } else if (sparse) {
    const maximum = Math.max(1, inputs.length - 1);
    selected = rng.shuffle(inputs).slice(0, rng.int(1, maximum));
  } else {
    selected = inputs.filter(() => rng.bool(0.68));
    if (selected.length === 0) selected.push(rng.pick(inputs));
    selected = selected.slice(0, advanced ? 3 : 2);
  }
  const terms = selected.map(name => polynomialTerm(name, rng, advanced));
  if (advanced && selected.length >= 2 && rng.bool(0.45)) {
    terms.push(mul(v(selected[0]), v(selected[1])));
  }
  if (rng.bool(0.25)) terms.push(c(rng.int(-4, 4)));
  return add(...terms);
}

export function generateRound(level = 6, seed = Date.now(), family = null) {
  const rng = new SeededRandom(seed);
  const numericLevel = Math.max(1, Math.min(14, Number(level) || 6));
  let selectedFamily = family;
  let inputCount = 2;
  let outputCount = 2;
  let inputs;
  let outputs;
  let point;
  let context;
  let mode = 'standard';
  let bugType;

  if (!selectedFamily) {
    if (numericLevel === 8) selectedFamily = 'identity';
    else if (numericLevel === 9) selectedFamily = 'diagonal';
    else if (numericLevel === 11) selectedFamily = 'evaluated';
    else if (numericLevel === 12) selectedFamily = rng.bool() ? 'affine' : 'activation';
    else if (numericLevel === 13) selectedFamily = 'repair';
    else if (numericLevel >= 14) selectedFamily = rng.bool() ? 'dense' : 'sparse';
    else if (numericLevel === 10) selectedFamily = rng.bool() ? 'dense' : 'sparse';
    else if (numericLevel === 7) selectedFamily = 'rectangular';
    else selectedFamily = 'polynomial';
  }

  switch (selectedFamily) {
    case 'identity': {
      inputCount = outputCount = rng.int(2, Math.min(4, numericLevel >= 10 ? 4 : 3));
      inputs = variableNames(inputCount);
      outputs = inputs.map((name, index) => ({ name: `f_${index + 1}`, expression: v(name) }));
      break;
    }
    case 'diagonal': {
      inputCount = outputCount = rng.int(2, 4);
      inputs = variableNames(inputCount);
      outputs = inputs.map((name, index) => {
        const kind = rng.pick(['power', 'sin', 'exp']);
        const expression = kind === 'sin' ? sin(v(name)) : kind === 'exp' ? exp(v(name)) : pow(v(name), rng.int(2, 3));
        return { name: `f_${index + 1}`, expression };
      });
      break;
    }
    case 'rectangular': {
      inputCount = rng.int(2, 4);
      do outputCount = rng.int(1, 4); while (outputCount === inputCount);
      inputs = variableNames(inputCount);
      outputs = Array.from({ length: outputCount }, (_, index) => ({
        name: `f_${index + 1}`,
        expression: buildPolynomialOutput(inputs, rng, { advanced: numericLevel > 7 }),
      }));
      break;
    }
    case 'dense': {
      inputCount = rng.int(2, numericLevel >= 14 ? 4 : 3);
      outputCount = rng.int(2, numericLevel >= 14 ? 4 : 3);
      inputs = variableNames(inputCount);
      outputs = Array.from({ length: outputCount }, (_, index) => ({
        name: `f_${index + 1}`,
        expression: buildPolynomialOutput(inputs, rng, { dense: true, advanced: numericLevel >= 14 }),
      }));
      break;
    }
    case 'sparse': {
      inputCount = rng.int(2, numericLevel >= 14 ? 4 : 3);
      outputCount = rng.int(2, numericLevel >= 14 ? 4 : 3);
      inputs = variableNames(inputCount);
      outputs = Array.from({ length: outputCount }, (_, index) => ({
        name: `f_${index + 1}`,
        expression: buildPolynomialOutput(inputs, rng, { sparse: true, advanced: numericLevel >= 14 }),
      }));
      break;
    }
    case 'evaluated': {
      inputCount = outputCount = 2;
      inputs = variableNames(inputCount);
      outputs = [
        { name: 'f_1', expression: add(pow(v('x_1'), 2), v('x_2')) },
        { name: 'f_2', expression: mul(v('x_1'), v('x_2')) },
      ];
      point = { x_1: 0, x_2: rng.int(1, 4) };
      break;
    }
    case 'affine': {
      inputCount = rng.int(2, 4);
      outputCount = rng.int(2, 4);
      inputs = variableNames(inputCount);
      outputs = Array.from({ length: outputCount }, (_, i) => ({
        name: `z_${i + 1}`,
        expression: add(...inputs.map(name => mul(c(nonZeroCoefficient(rng)), v(name))), v(`b_${i + 1}`)),
      }));
      break;
    }
    case 'activation': {
      inputCount = outputCount = rng.int(2, 4);
      inputs = variableNames(inputCount, 'z');
      outputs = inputs.map((name, index) => ({ name: `a_${index + 1}`, expression: relu(v(name)) }));
      point = Object.fromEntries(inputs.map((name, index) => [name, index % 2 === 0 ? rng.int(1, 4) : -rng.int(1, 4)]));
      context = { reluDerivativeAtZero: 0 };
      break;
    }
    case 'repair': {
      inputCount = outputCount = 2;
      inputs = variableNames(2);
      outputs = [
        { name: 'f_1', expression: add(pow(v('x_1'), 2), v('x_2')) },
        { name: 'f_2', expression: mul(v('x_1'), v('x_2')) },
      ];
      mode = 'repair';
      bugType = rng.pick(['transpose', 'wrong-cell', 'missing-zero']);
      break;
    }
    default: {
      inputCount = outputCount = numericLevel <= 5 ? 2 : rng.int(2, 3);
      inputs = variableNames(inputCount);
      outputs = Array.from({ length: outputCount }, (_, index) => ({
        name: `f_${index + 1}`,
        expression: buildPolynomialOutput(inputs, rng, { advanced: numericLevel >= 12 }),
      }));
    }
  }

  return createRound({
    id: `generated-${selectedFamily}-${numericLevel}-${Number(seed) >>> 0}`,
    seed: Number(seed) >>> 0,
    level: numericLevel,
    title: `Generated ${selectedFamily.replace('-', ' ')} round`,
    difficulty: numericLevel >= 12 ? 'advanced' : numericLevel >= 7 ? 'medium' : 'guided',
    mode: numericLevel >= 14 ? 'challenge' : mode,
    bugType,
    inputs,
    outputs,
    point,
    context,
    generated: true,
    family: selectedFamily,
    concepts: [`${selectedFamily}-jacobian`, 'generated-practice'],
  });
}

export function generateMany(count, options = {}) {
  const { level = 10, seed = 1, families = null } = options;
  const rounds = [];
  for (let index = 0; index < count; index += 1) {
    const family = families ? families[index % families.length] : null;
    rounds.push(generateRound(level, seed + index * 7919, family));
  }
  return rounds;
}
