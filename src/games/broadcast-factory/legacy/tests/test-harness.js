export class TestHarness {
  constructor(output = null) { this.output = output; this.passed = 0; this.failed = 0; this.results = []; }
  assert(condition, message) { if (!condition) throw new Error(message); }
  equal(actual, expected, message = 'Values differ') { this.assert(Object.is(actual, expected), `${message}: expected ${expected}, got ${actual}`); }
  deepEqual(actual, expected, message = 'Structures differ') { this.assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
  close(actual, expected, tolerance = 1e-6, message = 'Numbers differ') { this.assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`); }
  async test(name, fn) {
    try { await fn(); this.passed += 1; this.results.push({ name, passed: true }); }
    catch (error) { this.failed += 1; this.results.push({ name, passed: false, error: error.message }); }
    this.render();
  }
  render() {
    if (!this.output) return;
    this.output.replaceChildren();
    const summary = document.createElement('p'); summary.className = this.failed ? 'failed' : 'passed'; summary.textContent = `${this.passed} passed, ${this.failed} failed`; this.output.append(summary);
    const list = document.createElement('ol');
    this.results.forEach((result) => { const item = document.createElement('li'); item.className = result.passed ? 'passed' : 'failed'; item.textContent = result.passed ? `PASS — ${result.name}` : `FAIL — ${result.name}: ${result.error}`; list.append(item); });
    this.output.append(list);
  }
}
