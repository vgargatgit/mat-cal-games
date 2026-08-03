# Test Results

**Test date:** 2026-08-01  
**Runtime:** Node.js 22.16.0, Python 3.13.5

## Automated suite

```text
44/44 tests passed
```

Covered suites:

- dependency analysis;
- symbolic differentiation;
- symbolic parsing and equivalent-answer validation;
- misconception detection;
- seeded question generation;
- mastery transitions;
- LocalStorage schema validation and recovery.

## Generator invariant sweep

```text
Generated rounds:             2,000
Finite-difference checked:    1,476
Skipped by design:              524
Numerical failures:               0
```

Skipped rounds are gradient tasks, Bug Hunter tasks, or declared-dependent-variable rounds that require an explicit executable dependency function for a mathematically valid numerical check.

The invariant sweep also verified:

- every expression and expected derivative is structurally valid;
- every active variable is declared;
- additive-term and expression-size constraints hold;
- generated gradient component counts match their declared input order;
- seeded generation is deterministic.

## Full-answer validation sweep

An additional 500 generated rounds were answered programmatically using their derived expected roles, dependency classifications, rule selections, and canonical expressions.

```text
Full-answer validation failures: 0
```

## Static and security checks

- All JavaScript and module files passed `node --check`.
- All relative ES-module imports resolve to existing files.
- No `eval`, `new Function`, or inline `onclick` handlers were found.
- `index.html`, `js/app.js`, `js/data/levels.js`, local MathJax, and the browser test runner returned HTTP 200 from `python3 -m http.server`.

## Browser automation note

The packaging environment’s browser policy blocked Chromium and Playwright navigation to both localhost and `file://` with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore, automated end-to-end browser navigation could not be completed in this container. This is recorded as an environment limitation, not as a confirmed game defect. The project includes an in-browser test runner at `tests/tests.html` for execution in Chrome, Safari, Firefox, or Edge.
