import { runSuite } from './test-utils.js';
import { dependencyTests } from './dependency-tests.js';
import { derivativeTests } from './derivative-tests.js';
import { validatorTests } from './validator-tests.js';
import { generatorTests } from './generator-tests.js';
import { masteryTests } from './mastery-tests.js';
import { storageTests } from './storage-tests.js';

export const suites = [
  ['Dependency analysis', dependencyTests],
  ['Symbolic derivatives', derivativeTests],
  ['Answer validation', validatorTests],
  ['Question generation', generatorTests],
  ['Mastery model', masteryTests],
  ['Storage', storageTests]
];

export async function runAllTests() {
  const all = [];
  for (const [name, tests] of suites) all.push(...await runSuite(name, tests));
  return all;
}

if (typeof document !== 'undefined') {
  const output = document.getElementById('test-output');
  const summary = document.getElementById('test-summary');
  const results = await runAllTests();
  const passed = results.filter((result) => result.passed).length;
  summary.textContent = `${passed}/${results.length} tests passed`;
  summary.className = passed === results.length ? 'pass' : 'fail';
  results.forEach((result) => {
    const item = document.createElement('li');
    item.className = result.passed ? 'pass' : 'fail';
    item.textContent = `${result.passed ? 'PASS' : 'FAIL'} · ${result.suite} · ${result.name}${result.passed ? ` (${result.duration.toFixed(1)} ms)` : ` — ${result.error}`}`;
    output.append(item);
  });
}
