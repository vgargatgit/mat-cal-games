import { runAllTests } from './test-suite.js';
const results=await runAllTests();
for(const result of results){console.log(`${result.passed?'✓':'✗'} ${result.name} (${result.durationMs.toFixed(1)} ms)`);if(!result.passed)console.error(result.error);}
const failed=results.filter(result=>!result.passed);
console.log(`\n${results.length-failed.length}/${results.length} tests passed.`);
if(failed.length)process.exit(1);
