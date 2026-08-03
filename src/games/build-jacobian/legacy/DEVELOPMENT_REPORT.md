# Development Report

Build date: **2026-08-01**  
Release: **1.0.0**

## Mathematical convention

The game uses **numerator layout** throughout:

```text
f : ℝⁿ → ℝᵐ  ⇒  ∂f/∂x ∈ ℝᵐˣⁿ
```

Outputs define rows, inputs define columns, and `Jᵢⱼ = ∂fᵢ/∂xⱼ`.

Structural dependency is represented separately from symbolic and point-evaluated derivative values. Therefore an evaluated zero cannot erase an existing dependency path.

## Milestone 1 — Foundation

### Files created or modified

- `index.html`
- `css/reset.css`
- `css/theme.css`
- `css/app.css`
- `css/responsive.css`
- `js/app.js`
- `js/math-config.js`
- `js/math-renderer.js`
- `js/components/dom.js`
- `js/components/equation.js`
- `js/components/matrix-grid.js`
- `js/math/ast.js`
- `js/math/jacobian.js`

### Working behavior

- Application shell and navigation.
- Sensitivity Control Room visual language.
- Welcome screen.
- Seven-step tutorial.
- Safe AST representation.
- Shape utilities and labelled Jacobian grid.
- MathJax rendering with readable Unicode fallback.

### Tests executed

- Module syntax checks.
- Jacobian shape checks.
- Initial browser rendering checks.

### Known limitations at this milestone

- No complete game loop.
- Only foundational expression and grid behavior.

## Milestone 2 — Core interaction

### Files created or modified

- `js/data/levels.js`
- `js/data/rounds.js`
- `js/math/derivative.js`
- `js/math/equivalence.js`
- `js/engine/game-engine.js`
- `js/engine/scoring.js`
- `js/components/dependency-map.js`
- `js/accessibility.js`
- `js/app.js`

### Working behavior

- Row and column labelling.
- Cell selection and row-column highlighting.
- Partial-derivative workbench.
- Derivative tiles plus typed equivalent-expression input.
- Value and placement validation as separate concerns.
- First six progressive levels.
- Keyboard alternatives for drag-and-drop actions.
- Targeted feedback for initial misconception categories.

### Tests executed

- Parser and derivative-rule tests.
- Entry mapping tests.
- Symbolic-equivalence tests.
- Wrong-cell and row-column misconception tests.

### Known limitations at this milestone

- Structural families and neural-network rounds still incomplete.

## Milestone 3 — Structural and neural-network Jacobians

### Files created or modified

- `js/data/rounds.js`
- `js/data/concepts.js`
- `js/data/levels.js`
- `js/math/jacobian.js`
- `js/engine/game-engine.js`
- `js/app.js`

### Working behavior

- Rectangular, identity, diagonal, sparse, and dense rounds.
- Constant-output zero rows and unused-input zero columns.
- Symbolic-versus-evaluated Jacobians.
- ReLU activation and affine-layer rounds.
- Bug Hunter transpose and placement repair.
- Full fourteen-level catalogue.
- All twelve required deterministic sample rounds.

### Tests executed

- `I₂`, `I₃`, and `I₄` tests.
- Diagonal and sparse structure tests.
- Constant-row and unused-column tests.
- Affine and ReLU tests.
- Evaluated-zero and false-identity misconception tests.

### Known limitations at this milestone

- Generated practice, persistence, and dashboard work remained.

## Milestone 4 — Generation, mastery, and persistence

### Files created or modified

- `js/engine/seeded-random.js`
- `js/engine/generator.js`
- `js/engine/mastery.js`
- `js/engine/scoring.js`
- `js/state.js`
- `js/storage.js`
- `js/app.js`

### Working behavior

- Deterministic seeded question generation.
- Identity, diagonal, rectangular, polynomial, sparse, dense, evaluated, affine, activation, and repair families.
- Adaptive review recommendations.
- Per-concept mastery and misconception counts.
- Progress dashboard and concept notebook.
- Versioned LocalStorage.
- Export, validated import, reset, migration fallback, and corruption recovery.

### Tests executed

- Seed determinism.
- Storage validation.
- 2,000 generated-question invariant sweep.

### Known limitations at this milestone

- Formal accessibility audit and final cross-environment checks remained.

## Milestone 5 — Accessibility, verification, and packaging

### Files created or modified

- `js/accessibility.js`
- `js/math-renderer.js`
- `css/app.css`
- `css/responsive.css`
- `tests/test-suite.js`
- `tests/node-tests.mjs`
- `tests/run-tests.js`
- `tests/tests.html`
- `README.md`
- `ERRATA.md`
- `DEVELOPMENT_REPORT.md`
- `package.json`

### Working behavior

- Full keyboard-oriented control flow.
- Live-region feedback and descriptive grid cells.
- High contrast, large text, and reduced motion.
- Alternate dependency and matrix descriptions.
- Centered finite-difference verification with `ε = 10⁻⁵`.
- Node and browser test runners.
- Offline-readable equation fallback.
- Documentation and local errata process.

### Tests executed

- Complete `npm test` run: **25/25 test groups passed**.
- Generator invariant sweep: **2,000 questions passed**.
- Chromium end-to-end smoke test: welcome screen, level browser, full Level 6 Basic 2×2 round, correct shape and labels, four dependency paths, four typed derivative cells, classification, interpretation, round completion, four correct cells, score 485, and zero console/page errors.
- Static syntax and security scans.

### Known limitations

- Rich MathJax SVG typesetting is loaded from a pinned CDN; safe readable fallback is bundled.
- No independent WCAG audit or full physical-device/browser lab was performed. Direct Chromium navigation to localhost is blocked by this build environment's administrator policy, so the end-to-end browser test loaded the same ES modules through an in-memory import map; Python's local server command and module paths were validated separately.
- The expression language is deliberately bounded and is not a general CAS.
- General matrix-by-matrix derivatives remain outside scope.

## Final automated test result

```text
25/25 tests passed
```

The suite covers shape, entry mapping, parsing, symbolic differentiation, identity, diagonal, sparse, constant and unused components, affine and ReLU Jacobians, evaluated zeros, numerical verification, equivalence, misconceptions, persistence, deterministic generation, and 2,000 generated-round invariants.
