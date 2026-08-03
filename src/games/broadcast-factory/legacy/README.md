# Broadcast Factory

**Broadcast Factory** is the fifth game in a progressive matrix-calculus learning suite based on *The Matrix Calculus You Need for Deep Learning* by Terence Parr and Jeremy Howard.

The game teaches how one scalar can influence many vector outputs without becoming many independent variables. Learners classify operation types, predict shapes, compute forward values, wire dependencies, and assemble Jacobians.

## Architecture

1. Pure operation and shape models define operand compatibility and output shapes.
2. Numerical evaluation is separated from symbolic differentiation.
3. Dependency matrices record only structural influence, independently of derivative values.
4. Jacobians use numerator layout: output components are rows; differentiation-input components are columns.
5. A seeded generator produces reproducible orders with lengths from 2 to 5.
6. The factory UI renders scalar tokens, vector trays, matrix cargo, machines, wires, and assembly grids.
7. Versioned LocalStorage stores progress, mastery, misconceptions, partial state, and settings.
8. Browser and Node test runners verify deterministic examples, generated invariants, and finite differences.

## Mathematical convention

For

\[
\mathbf{f}\in\mathbb{R}^{m},\qquad \mathbf{x}\in\mathbb{R}^{n},
\]

Broadcast Factory uses numerator layout:

\[
\frac{\partial\mathbf{f}}{\partial\mathbf{x}}\in\mathbb{R}^{m\times n}.
\]

Therefore:

- vector output with respect to vector input → matrix;
- vector output with respect to scalar input → column vector;
- scalar output with respect to vector input → row vector;
- scalar output with respect to scalar input → scalar.

No screen silently switches conventions.

## Scalar expansion is not independent copying

For

\[
\mathbf{y}=\mathbf{x}+z,
\]

component expansion is

\[
y_i=x_i+z.
\]

The same variable `z` appears in every component equation. The factory diagram shows one scalar token branching into every output lane. It never creates separate variables `z₁,z₂,…,zₙ`.

This gives

\[
\frac{\partial\mathbf{y}}{\partial z}=\mathbf{1}\in\mathbb{R}^{n\times1},
\]

not an identity matrix and not a scalar.

## Supported operation semantics

| Operation type | Operand types | Output | Local rule |
|---|---|---|---|
| `vector-plus-scalar` | vector, scalar | vector | `yᵢ=xᵢ+z` |
| `scalar-plus-vector` | scalar, vector | vector | `yᵢ=z+xᵢ` |
| `vector-minus-scalar` | vector, scalar | vector | `yᵢ=xᵢ−z` |
| `scalar-minus-vector` | scalar, vector | vector | `yᵢ=z−xᵢ` |
| `scalar-times-vector` | scalar, vector | vector | `yᵢ=zxᵢ` |
| `vector-times-scalar` | vector, scalar | vector | `yᵢ=xᵢz` |
| `vector-plus-vector` | matching vectors | vector | `yᵢ=xᵢ+vᵢ` |
| `vector-minus-vector` | matching vectors | vector | `yᵢ=xᵢ−vᵢ` |
| `elementwise-multiply` | matching vectors | vector | `yᵢ=xᵢvᵢ` |
| `elementwise-divide` | matching vectors | vector | `yᵢ=xᵢ/vᵢ` |
| `dot-product` | matching vectors | scalar | `s=Σᵢxᵢvᵢ` |
| `sum-reduction` | vector | scalar | `s=Σᵢxᵢ` |
| `matrix-vector` | matrix, compatible vector | vector | `yᵢ=ΣⱼAᵢⱼxⱼ` |
| `shared-scale-shift` | vector, scalar, scalar | vector | `yᵢ=axᵢ+b` |
| `per-feature-scale-shift` | three matching vectors | vector | `yᵢ=γᵢxᵢ+βᵢ` |

A multiplication symbol is never sufficient to infer semantics; operand types are required.

## Dependency and derivative representations

A dependency matrix has one row per output component and one column per component of the selected differentiation target. Boolean entries indicate whether changing that input can change that output.

Derivative matrices use the same row-column organization, but each entry stores the local partial derivative value.

Examples:

\[
\frac{\partial(\mathbf{x}+z)}{\partial\mathbf{x}}=I,
\qquad
\frac{\partial(\mathbf{x}+z)}{\partial z}=\mathbf{1},
\]

\[
\frac{\partial(z\mathbf{x})}{\partial\mathbf{x}}=zI,
\qquad
\frac{\partial(z\mathbf{x})}{\partial z}=\mathbf{x},
\]

\[
\frac{\partial(\mathbf{x}\odot\mathbf{v})}{\partial\mathbf{x}}
=\operatorname{diag}(\mathbf{v}).
\]

## Implemented milestones

### Milestone 1

- application shell and mathematical-factory theme;
- welcome screen and eight-step tutorial;
- vendored MathJax rendering;
- scalar, vector, matrix, machine, and conveyor visuals;
- pure shape and operation models.

### Milestone 2

- broadcast-add and scalar-scale machines;
- forward evaluator;
- output-shape scanner;
- dependency wiring;
- derivative-shape predictor;
- levels 1–7.

### Milestone 3

- element-wise add, subtract, multiply, and advanced divide;
- dot-product and matrix-mixing comparisons;
- shared/vector bias and gate contexts;
- shared/per-feature shift-and-scale;
- Bug Hunter;
- levels 8–18.

### Milestone 4

- seeded generated orders;
- all 14 deterministic sample orders;
- symbolic derivatives;
- misconception-specific feedback;
- mastery, score, progress dashboard;
- LocalStorage import/export/reset and corrupted-state recovery.

### Milestone 5

- keyboard-operable controls;
- text alternatives and live announcements;
- visible focus, high contrast, reduced motion, font scaling;
- numerical derivative verification;
- Node and in-browser automated test runners;
- README and ERRATA process.

## Levels

1. Meet the Factory Cargo
2. Expand the Scalar
3. Output Shape Inspector
4. Broadcast Addition Dependencies
5. Differentiate Broadcast Addition
6. Scale Every Lane
7. Differentiate Scalar Scaling
8. Vector Plus Vector
9. Element-Wise Multiplication
10. Addition versus Multiplication Detective
11. Broadcast versus Dot Product
12. Broadcast versus Matrix Mixing
13. Bias Addition in a Neuron Layer
14. Learned Gates and Feature Scaling
15. Shift and Scale
16. Per-Feature Shift and Scale
17. Factory Bug Hunter
18. Final Factory Certification

Each level cycles through guided, generated practice, misconception-repair, and mastery-challenge modes. Exact sample orders are scheduled into their relevant levels before generated practice.

## Project structure

```text
broadcast-factory/
├── index.html
├── README.md
├── ERRATA.md
├── package.json
├── assets/
│   └── mathjax/
├── css/
│   ├── reset.css
│   ├── theme.css
│   ├── layout.css
│   ├── components.css
│   ├── math.css
│   ├── factory.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── storage.js
│   ├── math-renderer.js
│   ├── accessibility.js
│   ├── data/
│   ├── math/
│   ├── engine/
│   └── components/
└── tests/
    ├── tests.html
    ├── run-tests.mjs
    └── *-tests.js
```

## Run the game

From the directory that contains `broadcast-factory`:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/broadcast-factory/
```

Or, from inside the project directory:

```bash
cd broadcast-factory
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A local HTTP server is preferred over `file://` because browser ES modules are subject to origin and CORS restrictions when loaded directly from the filesystem.

## Run automated tests

### Node

```bash
npm test
```

The Node runner verifies operation values, derivative matrices, storage recovery, 2,500 generated-order invariants, and generated finite-difference comparisons.

### Browser

Start the local server, then open:

```text
http://localhost:8080/tests/tests.html
```

The browser runner executes the core semantic tests and 2,000 generator invariants.

## Numerical verification

Central finite differences use

\[
\epsilon=10^{-5}.
\]

For a scalar target:

\[
\frac{\partial y_i}{\partial z}
\approx
\frac{y_i(z+\epsilon)-y_i(z-\epsilon)}{2\epsilon}.
\]

For a vector target component:

\[
\frac{\partial y_i}{\partial x_j}
\approx
\frac{y_i(\mathbf{x}+\epsilon\mathbf{e}_j)-y_i(\mathbf{x}-\epsilon\mathbf{e}_j)}{2\epsilon}.
\]

Finite differences are used only for internal verification, not as the main learner-facing explanation.

## Mastery and adaptation

The game tracks attempts, correctness, first-attempt success, hints, recent results, contexts, and misconception counts per concept. Repeated errors lead to targeted feedback and progress recommendations. Generated values are deterministic for a stored seed.

## Persistence

Progress is stored under:

```text
matrixCalculusSuite.progress.v1
```

Imported JSON is schema-validated. Invalid or corrupted local state falls back safely to a clean default state.

## Accessibility

- all controls are standard keyboard-operable HTML controls;
- dependency wiring uses toggle buttons rather than pointer-only drag and drop;
- factory SVGs include meaningful text descriptions;
- equations expose accessible labels;
- validation uses an `aria-live` region;
- focus indicators are visible;
- reduced-motion and font-scale settings persist;
- no level requires a timer;
- machine distinctions use labels, shapes, and layout—not colour alone.

A formal third-party WCAG audit has not been performed.

## Security and code quality

- no `eval` or `new Function`;
- no inline event handlers;
- no backend or external API;
- MathJax's SVG renderer is vendored locally, so equations do not depend on separately downloaded webfonts;
- imported state is validated before use;
- mathematical data is separated from DOM rendering;
- invalid operand combinations are rejected explicitly;
- learner-entered values are parsed as numbers rather than injected as HTML.

## Errata process

Record discovered problems in `ERRATA.md`. Logging an erratum does not imply a behaviour change. Each entry includes the level, question ID, seed, expected and actual behaviour, mathematical impact, workaround, and status.

## Known limitations

- optional advanced tensor broadcasting rules are intentionally out of scope;
- the matrix-input Jacobian of `A x` is not assembled; the game investigates the local derivative with respect to `x`;
- row-vector play is represented in the shape model but generated rounds use column vectors;
- touch support uses accessible tap controls rather than free-form drag physics;
- no formal WCAG conformance audit or cross-device laboratory test has been completed.

## Add a machine type

1. Add an explicit entry to `js/math/operation-model.js` with operand types, family, symbol, and component rule.
2. Add compatibility and output-shape behaviour.
3. Implement numerical evaluation in `numeric-evaluator.js`.
4. Implement structural dependencies in `dependency-analysis.js`.
5. Implement the symbolic derivative in `symbolic-derivative.js`.
6. Add a generator family and safe operand constraints.
7. Add misconception rules and notebook content where relevant.
8. Add exact-value, derivative, finite-difference, and generator-invariant tests.
