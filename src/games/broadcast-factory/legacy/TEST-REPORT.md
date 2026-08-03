# Broadcast Factory Test Report

**Date:** 2026-08-02

## Automated suite

Command:

```bash
npm test
```

Result:

```text
47 passed, 0 failed
```

Coverage includes:

- forward evaluation for broadcast, element-wise, reduction, and matrix-vector operations;
- numerator-layout derivative shape and value checks;
- symbolic derivatives checked with central finite differences using `epsilon = 1e-5`;
- all deterministic sample rounds;
- 2,500 generated-round invariants;
- at least 100 generated rounds for every supported operation family;
- 180 generated symbolic-versus-numerical Jacobian comparisons;
- misconception detection;
- LocalStorage validation, round-trip persistence, import rejection, and corrupted-state recovery.
- readable math fallback and plain-text/SVG notation conversion.

## Static integrity

- `index.html`: all 10 local references resolve.
- `tests/tests.html`: all 3 local references resolve.
- JavaScript syntax checks pass for all source and test modules.
- No `eval`, `new Function`, inline event handlers, or `innerHTML` assignments were found.

## Browser-DOM smoke test

A headless Chromium smoke test exercised:

1. welcome-screen rendering;
2. all eight tutorial steps;
3. entry into Level 1;
4. creation of a factory order;
5. correct machine selection;
6. component-expansion selection;
7. unlocking the output station.

Result: passed with no browser console or page errors. A live loopback browser
check also confirmed that the core formula contains a non-zero MathJax SVG with
embedded glyph paths before its readable fallback is hidden.

## Remaining verification limits

- A formal WCAG audit was not performed.
- Cross-browser and physical-device laboratory testing was not performed.
