import {runTests} from './reduction-tests.js';
const results=runTests(),failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} [${r.group}] ${r.name}${r.error?` — ${r.error}`:''}`);console.log(`\n${results.length-failed.length}/${results.length} passed`);if(failed.length)process.exitCode=1;
