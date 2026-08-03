import { runAllTests } from './test-suite.js';

const status = document.getElementById('status');
const list = document.getElementById('results');
const button = document.getElementById('run-tests');

button.addEventListener('click', async () => {
  button.disabled = true;
  list.replaceChildren();
  status.textContent = 'Running tests…';
  const report = await runAllTests(result => {
    const item = document.createElement('li');
    item.className = result.ok ? 'pass' : 'fail';
    item.textContent = `${result.ok ? 'PASS' : 'FAIL'} — ${result.name}${result.ok ? '' : `: ${result.error}`}`;
    list.append(item);
  });
  status.textContent = `${report.passed}/${report.results.length} passed in ${report.durationMs.toFixed(1)} ms.`;
  button.disabled = false;
});
