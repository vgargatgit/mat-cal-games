# Build the Jacobian

**Build the Jacobian** is a browser-based matrix-calculus game built around a Sensitivity Control Room metaphor. Learners construct a Jacobian one scalar partial derivative at a time, while keeping output rows, input columns, dependencies, derivative values, and cell positions conceptually separate.

The project is the third game in a progression:

1. **Shape Sorter** — predict derivative shapes.
2. **Partial Derivative Freeze** — differentiate one scalar expression while holding other independent variables fixed.
3. **Build the Jacobian** — assemble those scalar partial derivatives into the correct matrix cells.

## Learning objective

For a vector-valued function

```text
f : ℝⁿ → ℝᵐ
```

the learner should internalize the numerator-layout Jacobian convention:

```text
J = ∂f/∂x ∈ ℝᵐˣⁿ
```

- Every **row** belongs to one scalar output component.
- Every **column** belongs to one independent input component.
- Cell `Jᵢⱼ` contains `∂fᵢ/∂xⱼ`.
- One row is the gradient of one scalar output.
- One column describes how all outputs respond to one selected input.

Some books use a transposed denominator-layout convention. This game never changes convention silently and explicitly diagnoses a submitted transpose.

## Architecture

1. A small application shell renders welcome, tutorial, game, notebook, progress, and settings views.
2. Mathematical expressions are immutable structured AST nodes rather than display strings.
3. Pure math modules parse, simplify, differentiate, evaluate, compare, and format expressions.
4. A Jacobian engine computes shape, dependency matrices, symbolic cells, evaluated cells, and structural classifications.
5. A deterministic round catalogue contains all required fixed examples; a seeded generator provides reproducible practice.
6. A stage-based game engine independently validates shape, labels, dependencies, derivative values, and cell placement.
7. Mastery, misconceptions, partially completed rounds, and settings persist through a versioned LocalStorage schema.
8. Browser and Node test runners verify symbolic results, misconceptions, numerical derivatives, storage, and 2,000 generated-round invariants.

## Jacobian data representation

A round is normalized into data resembling:

```javascript
{
  id: "sample-01-basic-2x2",
  seed: 73541,
  inputs: ["x_1", "x_2"],
  outputs: [
    { name: "f_1", expression: /* AST for x_1^2 + x_2 */ },
    { name: "f_2", expression: /* AST for x_1 x_2 */ }
  ],
  expectedShape: { rows: 2, columns: 2, semanticType: "matrix" },
  dependencyMatrix: [
    [true, true],
    [true, true]
  ],
  symbolicJacobian: [
    [/* 2x_1 */, /* 1 */],
    [/* x_2 */,  /* x_1 */]
  ],
  expectedJacobian: /* symbolic or point-evaluated AST matrix */,
  classification: {
    square: true,
    identity: false,
    diagonal: false,
    sparse: false,
    dense: true
  }
}
```

LaTeX and readable text are generated from the AST only for display. Raw LaTeX is not the mathematical source of truth.

## Structural dependency versus evaluated value

The engine stores dependency structure independently from derivative values.

- **Structural zero:** no path exists from an input to an output. The derivative is zero for every valid input value.
- **Evaluated zero:** a path exists, but the local derivative happens to be zero at the selected point.

For example, `∂(x₁² + x₂)/∂x₁ = 2x₁` evaluates to zero at `x₁ = 0`, yet the structural dependency remains present. The UI represents these cases with different labels and feedback.

## Implemented game flow

A standard round progresses through:

1. Predict the `outputs × inputs` shape.
2. Label output rows and input columns.
3. Locate a requested `Jᵢⱼ` cell when applicable.
4. Draw dependency wires from inputs to outputs.
5. Select a cell and isolate its scalar output.
6. Activate the chosen input and freeze the others.
7. Place a derivative tile or type an equivalent expression.
8. Validate the derivative value and its position independently.
9. Classify the completed Jacobian.
10. Interpret a cell, row, and column as local sensitivities.

Drag-and-drop is optional. Every placement and dependency action has button- and keyboard-based alternatives.

## Levels

1. **Rows Are Outputs** — attach output components to rows.
2. **Columns Are Inputs** — attach independent inputs to columns.
3. **Find the Cell** — map `Jᵢⱼ` to row `i`, column `j`.
4. **Build One Jacobian Row** — construct one scalar-output gradient.
5. **Build One Jacobian Column** — construct all output responses to one input.
6. **Complete a 2×2 Jacobian** — calculate and place four cells.
7. **Rectangular Jacobians** — practise `2×3` and `3×2` orientation.
8. **Identity Jacobian** — derive identity from copy relationships, not shape alone.
9. **Diagonal Jacobians** — recognize independent element-wise functions.
10. **Sparse and Dense Jacobians** — predict zeros from dependency paths.
11. **Evaluated Jacobians** — separate evaluated zeros from structural zeros.
12. **Neural-Network Jacobians** — build element-wise activation and affine-layer Jacobians.
13. **Jacobian Bug Hunter** — repair transposes, wrong-cell placements, and zero mistakes.
14. **Jacobian Assembly Challenge** — complete an unfamiliar mixed-dependency Jacobian with reduced scaffolding.

## Required deterministic rounds

The catalogue includes all twelve specified examples:

- Basic `2×2` Jacobian.
- Two-dimensional identity.
- Diagonal nonlinear function.
- Rectangular `2×3` mapping.
- Rectangular `3×2` mapping.
- Sparse Jacobian.
- Dense Jacobian.
- Constant-output zero row.
- Unused-input zero column.
- Evaluated Jacobian at `(0, 3)`.
- Element-wise ReLU away from zero.
- Affine transformation whose Jacobian is its coefficient matrix.

The ReLU convention used by the game is `ReLU′(0) = 0`.

## Expression AST

Supported node families include:

- Constants and variables.
- Addition and multiplication.
- Integer powers.
- `sin`, `cos`, and `exp`.
- ReLU with an explicit derivative-at-zero convention.

The derivative engine is pure and recursive. Simplification normalizes sums and products, combines constants and repeated terms, removes neutral elements, and canonicalizes commutative order.

The implementation does **not** use `eval` or `new Function`.

## Symbolic equivalence

Typed answers are checked with layered validation:

1. Parse into a restricted expression AST.
2. Simplify and normalize both expressions.
3. Compare canonical structures.
4. Use deterministic numerical spot checks at valid points when structural normalization is insufficient.

This accepts forms such as `x_1 + x_1` and `2x_1`, or reordered sums such as `x_1 + 2x_2` and `2x_2 + x_1`.

Numerical equality is not used to infer structural independence.

## Question generation

`js/engine/generator.js` creates deterministic rounds from a seed. Families include:

- Identity.
- Diagonal element-wise.
- Polynomial.
- Rectangular.
- Sparse.
- Dense.
- Evaluated.
- Affine.
- Activation.
- Repair.

Generation is constrained to one through four inputs and outputs, small integer coefficients, low polynomial powers, and bounded expression complexity. The invariant suite checks 2,000 generated questions per full test run.

## Mastery and adaptive review

Mastery is tracked independently for shape, row mapping, column mapping, entry notation, derivative calculation, placement, structural zeros, evaluated zeros, common Jacobian structures, interpretation, neural-network examples, and transpose detection.

The dashboard reports:

- Overall mastery.
- Completed levels and rounds.
- First-attempt accuracy.
- Hint usage.
- Misconception counts.
- Recommended review focus.

Repeated row-column reversals, incorrect placements, false zeros, false diagonal assumptions, and evaluated-zero confusion influence subsequent review recommendations.

## Persistence

Progress uses the suite-compatible key:

```text
matrixCalculusSuite.progress.v1
```

The schema stores level progress, mastery, misconceptions, current round state, tutorial completion, concept discoveries, and learner settings. The settings screen supports export, validated import, reset, migration fallback, and corruption recovery.

## Accessibility

The interface includes:

- Keyboard-accessible controls and non-drag alternatives.
- Persistent row and column labels.
- Visible focus indicators.
- Live-region feedback.
- Descriptive cell labels such as “Row 2, output f₂; column 1, input x₁.”
- Text alternatives for dependency diagrams.
- A list representation of matrix contents.
- High-contrast, large-text, and reduced-motion settings.
- Touch-friendly controls and no mandatory timing.

A formal third-party WCAG conformance audit has not been performed; see **Known limitations**.

## Equation rendering

The page loads pinned MathJax 3.2.2 `tex-svg` typesetting when a network connection is available. Before MathJax loads—or when it is unavailable—the application displays a safe built-in Unicode rendering for its controlled mathematical vocabulary. The symbolic AST and answer validation do not depend on MathJax.

## Numerical verification

The tests compare symbolic Jacobians against centered finite differences:

```text
∂fᵢ/∂xⱼ ≈ [fᵢ(x + εeⱼ) − fᵢ(x − εeⱼ)] / (2ε)
ε = 10⁻⁵
```

Finite differences are used only for implementation validation, never as the primary learner-facing derivation.

## Run the application

From the directory containing this project:

```bash
cd build-the-jacobian
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A local HTTP server is preferred to `file://` because browser security rules commonly restrict ES-module imports from local files. No backend, authentication, database, build system, or external API is required.

## Run the tests

Node-based suite:

```bash
npm test
```

Browser runner:

```text
http://localhost:8080/tests/tests.html
```

The current release passes **25 of 25** test groups, including the 2,000-question generator invariant sweep.

## Project structure

```text
build-the-jacobian/
├── index.html
├── package.json
├── README.md
├── ERRATA.md
├── DEVELOPMENT_REPORT.md
├── css/
│   ├── reset.css
│   ├── theme.css
│   ├── app.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── storage.js
│   ├── math-config.js
│   ├── math-renderer.js
│   ├── accessibility.js
│   ├── components/
│   │   ├── dom.js
│   │   ├── equation.js
│   │   ├── matrix-grid.js
│   │   └── dependency-map.js
│   ├── data/
│   │   ├── concepts.js
│   │   ├── levels.js
│   │   └── rounds.js
│   ├── engine/
│   │   ├── game-engine.js
│   │   ├── generator.js
│   │   ├── mastery.js
│   │   ├── scoring.js
│   │   └── seeded-random.js
│   └── math/
│       ├── ast.js
│       ├── derivative.js
│       ├── equivalence.js
│       └── jacobian.js
└── tests/
    ├── tests.html
    ├── test-suite.js
    ├── run-tests.js
    ├── node-tests.mjs
    ├── TEST_RESULTS.txt
    ├── STATIC_VALIDATION.txt
    └── browser-smoke-results.json
```

The implementation intentionally uses a smaller module tree than the suggested structure while preserving separation between math, game state, generation, rendering, persistence, and validation.

## Add a new question family

1. Add or reuse AST constructors in `js/math/ast.js`.
2. Add the derivative rule in `js/math/derivative.js` when introducing a new function node.
3. Add evaluation, dependency, formatting, and parsing support in the AST module.
4. Extend `generateRound()` in `js/engine/generator.js` with a named family.
5. Construct each generated round through `createRound()` so shape, dependencies, Jacobian cells, and classifications are derived centrally.
6. Add deterministic examples when the concept is pedagogically important.
7. Add symbolic, numerical, misconception, and generator-invariant tests.
8. Record any known mathematical or validation issue in `ERRATA.md` rather than silently changing expected behavior.

## Errata process

`ERRATA.md` is the local source of truth for known question, validation, rendering, or mathematical issues. Each entry records the game and level, question ID, seed, expected and actual behavior, impact, workaround, and status.

When a request is only to log an issue, add an erratum without changing the application behavior.

## Known limitations

- Rich SVG equation rendering uses the pinned MathJax CDN; the bundled Unicode fallback remains readable offline but is less typographically sophisticated.
- The safe answer parser intentionally supports a bounded educational expression language rather than arbitrary computer algebra.
- Advanced generated expressions stay within polynomial, elementary unary-function, affine, and ReLU scope; general matrix-by-matrix differentiation is intentionally excluded.
- Dependency drawing is click-based rather than freehand wire routing so that it remains keyboard accessible and deterministic.
- The application received automated, Chromium smoke, and manual visual checks, but not a full cross-browser device lab or independent WCAG audit.
- Generated rounds provide substantial deterministic practice, but the initial release does not contain a large authored narrative bank for every misconception in every level.
