# Chain Rule Circuit

Chain Rule Circuit is Game 7 in the progressive matrix-calculus learning suite inspired by Terence Parr and Jeremy Howard’s *The Matrix Calculus You Need for Deep Learning*. Learners turn expressions into explicit computation graphs, attach one immediate derivative to each dependency wire, trace every route between a selected input and output, multiply local sensitivities within a route, and add completed contributions where routes meet.

The application is a self-contained static site built with HTML5, modern CSS, vanilla JavaScript ES modules, SVG, vendored MathJax, and versioned LocalStorage. It has no backend, framework, build step, account system, database, or network dependency.

## Run locally

From the project directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A local HTTP server is preferred over `file://` because browsers restrict ES-module loading from local files. If port `8080` is already in use, choose another port and open the matching local URL.

Run the automated mathematical and state tests with:

```bash
npm test
```

The test script uses Node’s built-in module support; no package installation is required.

## Learning objective and suite relationship

The first six games establish the pieces that this game combines:

- **Shape Sorter** supplies the derivative-shape check before any Jacobian product.
- **Partial Derivative Freeze** supplies the immediate partial derivative on each edge.
- **Build the Jacobian** supplies vector local-derivative blocks.
- **Diagonal Detective** predicts sparse and diagonal local structure.
- **Broadcast Factory** supplies vector-output/scalar-input derivative columns.
- **Reduction Relay** supplies scalar-output/vector-input gradient rows.
- **Chain Rule Circuit** explains why those blocks multiply, why separate routes add, and how repeated local composition becomes backpropagation.

The central progression is:

```text
complex expression
→ intermediate variables
→ computation graph
→ local derivatives
→ multiply within each path
→ add across paths
→ verify shapes
→ final derivative
```

## Mathematical convention

The game uses **numerator layout** throughout and never silently transposes an answer. If `f ∈ Rᵐ` and `x ∈ Rⁿ`, then:

```text
∂f/∂x has shape m × n
```

For `x → u → y`:

```text
∂y/∂x = (∂y/∂u)(∂u/∂x)
```

with shapes:

```text
(m × p)(p × n) → m × n
```

The derivative nearest the final output appears on the left. Matrix products are not silently reordered, and alternate denominator-layout answers are described as a convention difference rather than treated as meaningless.

## Computation graphs and intermediate variables

Every circuit is represented as an explicit directed acyclic graph. Nodes store identity, semantic role, operation, shape, display label, optional forward value, optional accumulated gradient, and visual position. Edges store `from`, `to`, input position, local derivative expression, optional value, and derivative shape. Dependencies are never inferred from variable names alone.

Nested expressions are decomposed inside-out into one-operation assignments such as:

```text
u = x²
v = u + 1
y = v³
```

The learner then builds the corresponding forward topology. Graph validation independently rejects cycles, unknown endpoints, missing wires, extra wires, and reversed dependencies.

## Four quantities kept separate

The game deliberately gives each quantity its own visual and data channel:

- **Forward value** — the scalar, vector, or matrix produced by a node during forward computation.
- **Local derivative** — the immediate sensitivity attached to one edge, such as `du/dx = 2x`.
- **Backward-gradient contribution** — one sensitivity returning from one downstream use.
- **Accumulated gradient** — the sum of all returning contributions at a shared node.

A node value is never substituted for its local derivative, and a local derivative is never presented as the complete total derivative.

## Multiply along paths, add across paths

For a chosen input and output, the dependency engine enumerates every directed route. It walks each route backward and builds the numerator-layout product in output-to-input order. Shape validation checks every adjacent inner dimension before a route is accepted.

Only completed route products are accumulated. For:

```text
u = x²
v = 3x
y = u + v
```

the two paths contribute `1·2x` and `1·3`, so:

```text
dy/dx = 2x + 3
```

The same graph reasoning explains residual derivatives, shared-intermediate accumulation, and the product rule.

## Incoming gradients and reverse mode

When a later loss supplies `g = ∂L/∂y`, the learner must inject that signal separately:

```text
∂L/∂x = g · dy/dx
```

The reverse-mode engine initializes the selected output’s gradient ledger, visits nodes in reverse topological order, sums all contributions at a node, multiplies by each incoming edge’s local derivative, and appends each result to the parent ledger. A previous contribution is never overwritten.

This is the game’s backpropagation model: repeated local chain-rule application through a computation graph.

## Vector chains and neural-network circuits

Advanced rounds include:

- shape-only Jacobian chains;
- small ordered numerical Jacobian products;
- scalar-loss/vector-intermediate chains;
- diagonal element-wise activation Jacobians;
- element-wise products followed by reductions;
- scalar broadcasting followed by summation;
- residual paths and identity derivatives;
- ReLU gradient blocking without deleting structural edges;
- affine–activation–loss chains; and
- a mixed scalar/vector certification circuit.

The ReLU derivative at `z = 0` is declared as `0` in this game. A zero derivative blocks the current backward signal but never removes the forward dependency wire.

## Visual and interaction standard

The interface follows one bright **Electrical Circuit Laboratory** language across welcome, tutorial, game, notebook, and progress screens:

- warm paper and blueprint work surfaces rather than a dark generic dashboard;
- thick navy outlines, rounded cards, offset shadows, and restrained cartoon-mechanical details;
- large readable headings and controls with a consistent spacing scale;
- orange solid arrows for forward dependencies;
- purple derivative labels for local gains;
- blue dashed arrows for backward gradients;
- green junctions for accumulated route contributions;
- explicit words, arrow direction, line style, and symbols so colour is never the only cue;
- the same mission card, metrics, badges, feedback panels, and navigation grammar in every view; and
- no decorative blank panels that compete with the current learning task.

On phones, the level navigator remains horizontally scrollable, modes wrap into a two-column control grid, the console becomes a single column, and the circuit canvas scrolls horizontally so node labels and wire geometry remain legible instead of being compressed into unreadable shapes.

## Five-stage game loop

Each graph round uses the same staged control console:

1. **Decompose** — choose every valid one-operation assignment.
2. **Connect** — construct the exact forward dependency graph.
3. **Label** — assign one immediate derivative and shape to each wire.
4. **Trace** — select every path from the requested input to output.
5. **Propagate** — order serial factors, complete parallel route products, accumulate branches, inject an incoming gradient when required, and submit the final derivative.

A learner cannot advance past an incomplete stage. Final-formula correctness does not hide a missing wire, a wrong local derivative, a missing path, an incorrect block order, or an unaccumulated branch.

Shape-only and matrix-value rounds begin directly at the propagation bench because their topology is already supplied.

## Levels, modes, and deterministic rounds

The game contains 22 progressive levels, from expression decomposition through mixed scalar/vector certification. Every level offers:

- **Guided** curriculum practice;
- **Generated** seeded practice;
- **Repair** mode focused on misconceptions; and
- **Mastery** mode with reduced scaffolding.

All 14 required deterministic sample rounds are included. Seeded generation uses bounded serial, branch, residual, ReLU, and shape families with safe coefficients, dimensions, domains, path counts, and operation counts.

## Diagnostic feedback and scoring

Validation scores the reasoning stages independently: decomposition, graph nodes and wires, forward values, local derivatives, derivative shapes, path detection, route multiplication, branch accumulation, incoming-gradient handling, final derivative, and explanation.

Feedback identifies the first structural fault and maps it to a specific misconception. A correct final expression therefore cannot conceal an incomplete or pedagogically wrong circuit. Partial credit is preserved when most reasoning stages are correct.

## Mastery, adaptation, and persistence

Mastery records attempts, accuracy, first-attempt success, hints, recent outcomes, contexts, misconception counts, and practice dates by concept. The progress dashboard recommends the weakest reasoning channel rather than collapsing all performance into one score.

LocalStorage uses a suite-compatible, versioned schema. The exact current round and partial construction are restored across refreshes, including selected assignments, wires, derivative labels, paths, route products, accumulation state, incoming-gradient state, final answer, and current stage.

Progress can be exported to JSON, imported after schema validation, or reset with confirmation. Invalid and corrupt stored data recover safely to defaults.

## Project structure

```text
index.html                 application entry and shared shell
css/                       reset, tokens, layout, components, circuit, responsive styles
js/app.js                  routing, stage orchestration, persistence handoff
js/data/                   levels, rounds, concepts, gates, misconceptions
js/math/                   graph, shape, derivative, Jacobian, chain, gradient logic
js/engine/                 generation, staged validation, scoring, mastery, randomness
js/components/             safe DOM helpers and SVG circuit rendering
js/views/                  welcome, tutorial, lab, notebook, progress
js/vendor/                 vendored MathJax bundle and license
tests/                     Node and in-browser test runners
ERRATA.md                  reproducible issue and resolution log
```

## Testing and numerical verification

`npm test` currently runs 42 checks covering:

- graph construction, unknown endpoints, cycle rejection, and topological order;
- all-path discovery and output-nearest derivative ordering;
- scalar chains, long chains, residuals, products, shared intermediates, and incoming gradients;
- preservation and accumulation of separate gradient contributions;
- numerator-layout Jacobian shapes, chain compatibility, and numerical products;
- ReLU blocking and boundary convention;
- misconception-specific validation;
- exact staged-submission requirements;
- LocalStorage round trips, corruption recovery, and import validation;
- mastery and misconception tracking;
- corrected curriculum-to-graph mappings; and
- 2,000 seeded generator-invariant rounds.

Central finite differences with `ε = 10⁻⁵` verify representative serial, residual, product, broadcast/reduction, and scalar-output/vector-input examples. Numerical differentiation is used only as internal verification, not as the learner-facing explanation.

The in-browser runner is available at:

```text
http://localhost:8080/tests/tests.html
```

## Accessibility

The app targets practical WCAG 2.1 AA expectations with:

- semantic buttons, labels, selects, fields, and headings;
- keyboard-complete alternatives for every visual circuit action;
- a skip link and visible focus indicators;
- text alternatives for every computation graph;
- accessible ordered path lists and live-region feedback;
- SVG titles and descriptions;
- large text and reduced-motion toggles;
- non-colour labels, symbols, line directions, and line styles;
- touch-friendly control targets;
- responsive layouts; and
- no mandatory timer.

Reduced-motion mode removes instructional pulses and animated dash movement while preserving the same information statically.

## Security and code quality

The application does not use `eval`, `new Function`, inline event handlers, or learner-controlled `innerHTML`. Imported state is validated. Graph topology, rendering positions, symbolic expressions, numerical values, derivative shapes, local derivatives, and accumulated gradients remain separate.

## Add a new operation gate

1. Add gate metadata to `js/data/circuit-components.js`.
2. Add forward behaviour to `applyOperation` in `js/math/numeric-evaluator.js`.
3. Add the immediate derivative and explicit shape in `js/math/symbolic-derivative.js`.
4. Add safe generation constraints and deterministic curriculum coverage.
5. Add graph, shape, backward, misconception, and finite-difference tests.
6. Document any nondifferentiable boundary convention in the notebook and this README.

## Errata process

Record confirmed defects in `ERRATA.md` with an ID, date, level, question ID, seed, expected and actual behaviour, learner impact, workaround, and status. Resolved entries remain in the log so mathematical and interaction changes are traceable.

## Known limitations

- Symbolic equivalence accepts curated canonical forms rather than using a full computer algebra system.
- Generated practice uses bounded graph archetypes; the deterministic curriculum supplies richer shared, product, reduction, broadcast, diagonal, and neuron circuits.
- The editor targets supplied small DAGs and does not support recurrent graphs, arbitrary learner-authored operations, or full tensor calculus.
- Numerical matrices are intentionally small so arithmetic does not obscure dependency order.
- Browser automation in this repository exercises Chromium; manual release checks should still cover current Safari, Firefox, and Edge.
