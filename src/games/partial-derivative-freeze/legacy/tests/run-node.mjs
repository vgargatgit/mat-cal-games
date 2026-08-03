import { performance } from 'node:perf_hooks';
globalThis.performance = globalThis.performance || performance;
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};
const { runAllTests } = await import('./runner.js');
const results = await runAllTests();
const failed = results.filter((result) => !result.passed);
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} | ${result.suite} | ${result.name}${result.passed ? '' : ` | ${result.error}`}`);
console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) process.exitCode = 1;
