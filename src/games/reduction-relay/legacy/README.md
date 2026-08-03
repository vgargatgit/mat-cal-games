# Reduction Relay

Reduction Relay is Game 6 in a progressive browser-based matrix-calculus learning suite. The first five games introduce shapes, partial derivatives, dependencies, Jacobians, and diagonal structure; this game connects those ideas to many-to-one reductions and reverse-mode gradient propagation.

The learner builds a genuine relay:

```text
vector components → lane-wise intermediates → scalar reduction
→ derivative shape → local derivatives → upstream propagation → final gradient row
```

## Mathematical convention

The entire game uses **numerator layout**. For scalar `s` and an `n×1` column vector `x`, `∂s/∂x ∈ R^(1×n)`. A scalar-with-respect-to-vector gradient is always a row; a column is diagnosed and is never silently accepted.

A reduction is many-to-one, but it does not erase structural dependencies. For a sum, `∂s/∂x = [1 … 1]`; for a mean, `∂m/∂x = (1/n)[1 … 1]`. Weighted sums preserve lane-specific weights.

A dot product is explicitly decomposed:

```text
x and y → element-wise multiplication → product vector p → sum → scalar s
```

Thus the product-vector Jacobian with respect to `x` is `diag(y)`, while the final scalar gradient is `[1 … 1]diag(y) = yᵀ`. This is distinct from element-wise multiplication, which stops at a vector. Incoming gradients multiply local derivatives along each path.

Loss rounds distinguish sum from mean aggregation, including sum/mean squared errors and batch-loss scaling.

## Levels and rounds

All 20 levels are available from the level selector. Each exposes guided, deterministic seeded practice, misconception-repair, and mastery modes. The shared seven-checkpoint workspace changes its operation family, values, intermediate work, derivative target, upstream gradient, and explanation by level.

The workspace includes an ordered stage builder, shape baton, lane calculator, reduction funnel, differentiation target, derivative tiles, backward distributor, final row assembly, targeted earliest-stage feedback, hints, and a completion explanation. Every stage action has semantic add/move-left/move-right/remove buttons, so drag and drop is not required. Guided rounds provide a conceptual clue, practice provides tiles and hints, and mastery removes those aids. The nine-step tutorial requires a correct choice at every checkpoint.

## Supported mathematics

- Element-wise addition and multiplication, square, scale, and identity/no reduction
- Sum, mean, weighted sum, sum/mean of squares, weighted sum of squares
- Maximum with a unique argmax; ties are explicitly rejected as nondifferentiable
- Sum/mean of losses, SSE, and MSE
- Dot product as element-wise multiplication followed by sum
- Explicit row, column, and global sums of rectangular matrices in the axis preview
- Forward values, shape inference, local derivatives, structural dependencies
- Reverse traversal, upstream scalar propagation, and multi-path accumulation
- Explicit DAG validation: missing inputs, duplicate outputs, unsupported operations, cycles, empty reductions, and incompatible lane lengths

Pure APIs live under `js/math`, notably `computeReductionOutput`, `computeOutputShape`, `reductionGradient`, `expandDotProduct`, `computePipelineForward`, `computeLocalDerivative`, `propagateGradientBackward`, `validateGradientShape`, and structural-dependency propagation. Rendered symbols never determine operation semantics.

## Project structure

```text
css/                 layout, theme, relay, responsive, accessibility polish
js/components/       reusable pipeline and lane rendering
js/data/             levels, concepts, misconceptions, deterministic rounds
js/engine/           validation, generation, scoring, mastery, seeded RNG
js/math/             pure values, shapes, DAG, Jacobians, dependencies
js/views/            welcome, tutorial, relay, progress, results
tests/               browser runner, Node runner, Chrome smoke harness
index.html            application entry point
```

Pipelines use explicit stage records (`id`, `op`, `inputs`, `output`, and optional `params`). Generated questions use a seeded linear-DAG subset with vector lengths 2–5, nonzero introductory coefficients, matched dot operands, and no more than the allowed stage count.

## Mastery, adaptation, and persistence

Scoring records pipeline, shape, lane-value, scalar, derivative-shape, local-derivative, and final-gradient checkpoints separately. Correct checkpoints retain partial credit. Mastery uses the ten most recent first-submission outcomes, hint use, first-attempt work, streaks, contexts, and misconception counts. A retry can complete a round but cannot inflate mastery. The progress screen recommends targeted repair based on repeated misconception patterns.

State is stored under `matrixCalculusSuite` with schema version 1. It includes level completion, score, current seed, the in-progress relay, all checkpoint inputs, hint use, tutorial state, settings, mastery, and misconceptions. Loading recovers from corrupt state. Imports have a 250 KB limit, safe JSON parsing, schema migration, strict field validation, and prototype-pollution key rejection.

## Accessibility and math rendering

Controls are semantic and keyboard/touch operable, focus is visible, input labels are explicit, feedback is announced through a live region, diagrams have text descriptions, targets are touch sized, layout scales responsively, and font-size/reduced-motion preferences persist. There is no mandatory timer. MathJax may enhance notebook/tutorial equations from its CDN; controls do not wait for it, and a readable text fallback replaces delimiters when the renderer is unavailable.

## Run

```bash
cd reduction-relay
python3 -m http.server 8080
```

Open `http://localhost:8080`. HTTP serving is required because browsers restrict ES-module loading and module-relative imports from `file://` pages.

Open tests at `http://localhost:8080/tests/tests.html`, or run:

```bash
npm test
npm run check
```

The suite covers values, derivatives, incoming gradients, shapes, diagnostics, persistence validation, all 16 deterministic samples, 2,000 generated rounds, DAG rejection cases, structural zeros, and central finite differences with `ε = 10⁻⁵`.

## Adding a reduction stage

1. Add explicit metadata and numerical/gradient semantics in `js/math/reduction-model.js`.
2. Add stage evaluation, local derivative, and shape behavior to the pipeline/shape modules.
3. Add generator metadata and a level context without relying on display text.
4. Add a targeted diagnostic and deterministic sample where appropriate.
5. Add analytic, incoming-gradient, finite-difference, and generator-invariant tests.

## Known limitations and errata

Matrix-mix construction and tensor axes above rank two remain outside the implemented scalar/vector and rectangular-matrix subset. Maximum rounds require a unique maximum and do not teach a chosen subgradient at ties. Later levels reuse the common relay workspace rather than bespoke minigames. `ERRATA.md` records the closed exploratory findings and the small residual scope limitations.
