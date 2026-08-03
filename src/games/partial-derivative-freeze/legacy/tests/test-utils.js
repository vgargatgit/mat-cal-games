export function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}
export function equal(actual, expected, message = '') {
  if (actual !== expected) throw new Error(`${message ? `${message}: ` : ''}expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
export function approx(actual, expected, tolerance = 1e-7, message = '') {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${message ? `${message}: ` : ''}expected ${expected} ± ${tolerance}, received ${actual}`);
}
export function test(name, fn) { return { name, fn }; }
export async function runSuite(name, tests) {
  const results = [];
  for (const item of tests) {
    const start = performance.now();
    try {
      await item.fn();
      results.push({ suite: name, name: item.name, passed: true, duration: performance.now() - start });
    } catch (error) {
      results.push({ suite: name, name: item.name, passed: false, duration: performance.now() - start, error: error.message, stack: error.stack });
    }
  }
  return results;
}
