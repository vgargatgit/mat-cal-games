# Implementation Milestone Log

## Initial architecture and assumptions

- Structured AST and pure dependency analysis are kept separate from DOM rendering.
- Variables are independent unless the round declares a relationship.
- Partial derivatives freeze other independent inputs; total derivatives include declared indirect paths.
- Frozen symbols remain as constant multipliers inside changing terms.
- Local derivatives multiply along a path; separate paths add.
- Numerator layout is used for gradients.
- Seeded generation is deterministic and constrained.
- LocalStorage uses a versioned suite-compatible learner schema.

## Milestone 1 — Shell, tutorial, math model, dependency engine

### Files created or modified

- `index.html`
- `css/reset.css`, `css/theme.css`, `css/layout.css`
- `js/app.js`, `js/math-renderer.js`, `js/accessibility.js`
- `js/math/expression-model.js`
- `js/math/dependency-analysis.js`
- `js/math/symbolic-derivative.js`
- `js/math/expression-simplifier.js`
- `js/views/welcome-view.js`, `js/views/tutorial-view.js`
- vendored MathJax under `vendor/mathjax`

### Working behaviour

- Responsive application shell and welcome screen.
- Six-step interactive tutorial.
- Offline MathJax rendering with source fallback.
- AST construction, LaTeX/plain formatting, evaluation, dependency classification, path finding, differentiation, and simplification.

### Tests executed

- Direct Node module-import smoke checks.
- Manual derivative spot checks for frozen multipliers and nested expressions.

### Known limitations at this milestone

- No full game protocol or persistence yet.

## Milestone 2 — Freezer, scanner, builder, validation, early levels

### Files created or modified

- `js/components/variable-freezer.js`
- `js/components/dependency-scanner.js`
- `js/components/derivative-rule-tray.js`
- `js/components/derivative-builder.js`
- `js/components/shape-check.js`
- `js/components/feedback-panel.js`
- `js/math/expression-validator.js`
- `js/engine/answer-validator.js`
- `js/data/levels.js`, `js/data/derivative-rules.js`, `js/data/misconceptions.js`
- `css/components.css`, `css/game.css`

### Working behaviour

- Active/frozen role placement by drag or explicit controls.
- Term dependency classification.
- Rule-card placement.
- Structured token palette and safe expert entry.
- Independent validation of shape, active variable, freezing, dependencies, rules, and derivative.
- Misconception-specific feedback for deleted multipliers, frozen mixed terms, wrong active variables, and more.
- First four progressive levels and required deterministic rounds.

### Tests executed

- Parser and symbolic-equivalence spot checks.
- Full valid and intentionally invalid frozen-multiplier submissions.

### Known limitations at this milestone

- Advanced graphs, gradients, and adaptive generation were pending.

## Milestone 3 — Advanced dependencies, gradients, neurons, Bug Hunter

### Files created or modified

- `js/components/dependency-graph.js`
- `js/components/sensitivity-demo.js`
- `js/views/game-view.js`
- `js/data/concepts.js`
- advanced round definitions in `js/data/levels.js`

### Working behaviour

- SVG dependency wires and accessible graph descriptions.
- Active-value sensitivity chamber with frozen values held fixed.
- Product-rule versus constant-multiple rounds.
- Nested functions and scalar chain rule.
- Explicit `y=y(x)` total derivatives.
- Multiple computation paths.
- Numerator-layout gradient assembly.
- Affine-neuron local derivatives.
- First-error Bug Hunter rounds.
- Twelve accessible progressive levels.

### Tests executed

- Exact required sample derivatives.
- Gradient component-order checks.
- Declared dependency and multiple-path symbolic checks.

### Known limitations at this milestone

- No adaptive generation or persistent mastery yet.

## Milestone 4 — Generation, equivalence, mastery, LocalStorage

### Files created or modified

- `js/engine/seeded-random.js`
- `js/engine/question-generator.js`
- `js/engine/scoring.js`
- `js/engine/mastery.js`
- `js/engine/game-engine.js`
- `js/state.js`, `js/storage.js`
- `js/views/progress-view.js`, `js/views/notebook-view.js`

### Working behaviour

- Seeded generated questions across all families.
- Weakness-driven adaptive review.
- Structural and numerical equivalence validation.
- Partial-credit scoring and streak bonuses.
- Per-concept mastery states and misconception counts.
- Versioned persistence, import, export, reset, and corruption recovery.
- Concept notebook and progress dashboard.

### Tests executed

- Determinism checks.
- Storage round trips and malicious/corrupt field sanitization.
- Mastery-state transitions.

### Known limitations at this milestone

- Final accessibility review and large generator sweep were pending.

## Milestone 5 — Accessibility, numerical checks, tests, documentation, polish

### Files created or modified

- `css/responsive.css`
- `tests/tests.html`
- `tests/dependency-tests.js`
- `tests/derivative-tests.js`
- `tests/generator-tests.js`
- `tests/validator-tests.js`
- `tests/mastery-tests.js`
- `tests/storage-tests.js`
- `tests/runner.js`, `tests/run-node.mjs`, `tests/test-utils.js`
- `README.md`, `ERRATA.md`, `IMPLEMENTATION_LOG.md`, `package.json`

### Working behaviour

- Keyboard-operable controls and explicit drag alternatives.
- Focus indicators, live feedback, reduced motion, larger text, touch sizing, and graph alternatives.
- Central finite-difference verification with `epsilon = 1e-5`.
- In-browser and Node test runners.
- Offline distributable project with vendored MathJax.

### Tests executed

- 44/44 automated tests passed.
- 2,000 generated questions passed structural invariants.
- 1,476 generated scalar rounds received finite-difference verification; all passed tolerance.
- Static HTTP serving confirmed with Python 3’s HTTP server.
- JavaScript module syntax and import checks completed.

### Known limitations

- The expert parser is intentionally smaller than a full CAS.
- Advanced algebraic identities are not normalized.
- Full end-to-end backpropagation is reserved for a future game.
- A container-provided Chromium process did not complete a localhost page load during packaging, so the final automated browser smoke check was limited to HTTP availability and module-level tests. This is an execution-environment limitation rather than a confirmed application defect.
