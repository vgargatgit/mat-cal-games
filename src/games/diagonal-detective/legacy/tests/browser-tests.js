import { runAllTests } from './test-suite.js';
const output=document.getElementById('results');
const summary=document.getElementById('summary');
const results=await runAllTests();
results.forEach(result=>{const row=document.createElement('tr');row.innerHTML=`<td class="${result.passed?'test-pass':'test-fail'}">${result.passed?'PASS':'FAIL'}</td><td>${result.name}</td><td>${result.durationMs.toFixed(1)} ms</td><td><pre>${result.error??''}</pre></td>`;output.append(row);});
const failed=results.filter(result=>!result.passed);summary.textContent=`${results.length-failed.length}/${results.length} tests passed.`;summary.className=failed.length?'test-fail':'test-pass';
