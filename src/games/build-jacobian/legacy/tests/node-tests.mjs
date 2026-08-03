import { runAllTests } from './test-suite.js';

const report = await runAllTests(result => {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${result.name}${result.ok ? '' : ` — ${result.error}`}`);
});
console.log(`\n${report.passed}/${report.results.length} tests passed in ${report.durationMs.toFixed(1)} ms.`);
if (!report.ok) process.exitCode = 1;
