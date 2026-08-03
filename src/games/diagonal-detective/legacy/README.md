# Diagonal Detective

**Trace the dependencies. Expose the zeros.**

Diagonal Detective is the fourth game in a progressive matrix-calculus learning suite inspired by *The Matrix Calculus You Need for Deep Learning* by Terence Parr and Jeremy Howard. It follows Shape Sorter, Partial Derivative Freeze, and Build the Jacobian.

The game teaches learners to treat a Jacobian as a **dependency map before a derivative matrix**:

```text
inspect outputs
→ trace input-to-output paths
→ draw evidence wires
→ mark possible nonzeros and structural zeros
→ calculate selected derivatives
→ evaluate local slopes when relevant
→ classify the Jacobian structure
```

## Architecture — eight decisions

1. Expressions are represented as typed AST nodes; dependency is never inferred by raw string search.
2. Inputs, named intermediates, and outputs form a directed acyclic computation graph.
3. Graph reachability produces an output-by-input dependency matrix and all named dependency paths.
4. The structural Jacobian, symbolic Jacobian, and evaluated Jacobian are separate data layers.
5. Classification is implemented as pure matrix-structure functions independent of the UI.
6. Deterministic cases and seeded generated cases share the same normalized case model.
7. UI views, evidence-board components, validation, scoring, mastery, and persistence are separated into ES modules.
8. The game uses a versioned suite-compatible LocalStorage object with validation, export, import, reset, and corrupted-state recovery.

## Mathematical convention

The game uses **numerator layout** throughout. For `f : Rⁿ → Rᵐ`, the Jacobian has shape `m × n`:

- row `i` corresponds to output `fᵢ`;
- column `j` corresponds to input `xⱼ`;
- cell `(i,j)` contains `∂fᵢ/∂xⱼ`.

The dependency matrix uses exactly the same orientation:

```text
Dᵢⱼ = 1  when at least one path xⱼ → … → fᵢ exists
Dᵢⱼ = 0  otherwise
```

The dependency matrix is not the Jacobian. It records where Jacobian entries **may** be nonzero.

## Computation-graph representation

Each case has declared input nodes, optional named intermediate nodes with expression ASTs, and output nodes with expression ASTs. Directed edges run from each directly referenced named quantity to the node that consumes it.

The graph builder rejects undeclared references and cycles. Reachability determines structural dependence. `findAllDependencyPaths()` returns every named route, allowing

```text
u = x₁x₂
 y = u + x₁
```

to retain both `x₁ → u → y` and `x₁ → y`. The structural map marks one cell, while the derivative combines both path contributions.

## Structural zero versus evaluated zero

### Structural zero: `0`

- no path exists from the input to the output;
- the derivative is zero for every valid input value;
- the evidence wire is absent;
- `zeroReason` is `no-dependency`.

### Evaluated zero: `0*`

- a structural path exists;
- the symbolic derivative is not identically zero;
- the derivative happens to evaluate to zero at the selected point;
- the evidence wire remains visible;
- `zeroReason` is `local-slope-zero` or `inactive-activation`.

ReLU cases retain the matching structural wire while showing a closed local gradient gate for an inactive coordinate. The game uses derivative value `0` at the ReLU boundary `z=0`.

## Supported classifications

- **Square:** output rows equal input columns.
- **Diagonal:** square, with every off-diagonal structural cell zero.
- **Identity:** diagonal, with every symbolic diagonal derivative identically one.
- **Sparse:** at least one-third of cells are structural zeros. This is a pedagogical display threshold, not a universal definition.
- **Dense:** every output depends on every input.
- **Upper triangular:** every structural cell below the main diagonal is zero.
- **Lower triangular:** every structural cell above the main diagonal is zero.
- **Block diagonal:** a small contiguous partition has no cross-block paths and at least one block contains genuine internal coupling.
- **Permutation-like:** a square non-diagonal pattern with exactly one dependency in each row and column.
- **Zero row:** an output depends on no input.
- **Zero column:** an input influences no output.

Diagonal matrices are mathematically both upper and lower triangular. Early levels hide those redundant labels; triangular labels become learner-facing in the advanced level.

## Implemented milestones

### Milestone 1

- application shell and detective-agency theme;
- welcome screen and eight-step tutorial;
- vendored local MathJax SVG rendering;
- expression AST and validation;
- DAG computation graph;
- direct dependency analysis.

### Milestone 2

- connectable Evidence Wire Board;
- keyboard-operable input and output nodes;
- explicit Add Dependency and Remove Dependency controls;
- structural Jacobian grid and zero markers;
- staged validation and misconception feedback;
- first six progressive levels.

### Milestone 3

- sparse and dense cases;
- indirect paths and multiple paths;
- structural-versus-evaluated zero comparator;
- ReLU state cases;
- affine feature-mixing cases;
- repair-mode bug hunt.

### Milestone 4

- block-diagonal and triangular cases;
- deterministic seeded generation;
- independent, sparse, dense, triangular, indirect, and evaluated-zero generated families;
- adaptive generated review based on the most frequent misconception;
- mastery dashboard and suite-compatible LocalStorage persistence.

### Milestone 5

- keyboard and screen-reader alternatives;
- reduced-motion and larger-text settings;
- symbolic differentiation and finite-difference verification;
- Node and in-browser test runners;
- README, errata process, and release packaging.

## Levels

1. Find the Evidence
2. No Path Means Zero
3. One-to-One Dependency
4. Diagonal Is Not Identity
5. Square Is Not Diagonal
6. Cross-Component Influence
7. Sparse Detective
8. Dense Dependency Web
9. Indirect Dependency
10. Multiple Paths, One Cell
11. Structural Zero versus Evaluated Zero
12. ReLU Evidence Board
13. Feature Mixing versus Element-Wise Processing
14. Block-Diagonal Cases
15. Triangular Dependency Cases
16. Detective Bug Hunt
17. Final Case File

All fourteen required deterministic sample cases are present. Constant-output, unused-input, and independent-nonlinear samples appear as alternate case files in their related levels.

## Main interaction

A standard investigation asks the learner to:

1. predict the Jacobian shape;
2. select an input suspect and output case to create or remove a dependency wire;
3. transfer the learner’s wire map into the structural grid;
4. mark structural nonzeros, structural zeros, and—when relevant—evaluated zeros;
5. select all applicable classifications;
6. calculate selected derivative cells;
7. label the reason for each evaluated zero;
8. check the case, use progressive clues, or reveal the report.

These dimensions are scored separately, so a small algebra error does not erase correct structural reasoning.

## Project structure

```text
diagonal-detective/
├── index.html
├── README.md
├── ERRATA.md
├── package.json
├── css/
│   ├── reset.css
│   ├── theme.css
│   ├── layout.css
│   ├── components.css
│   ├── game.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── storage.js
│   ├── math-renderer.js
│   ├── accessibility.js
│   ├── vendor/mathjax-tex-svg.js
│   ├── data/
│   ├── math/
│   ├── engine/
│   ├── components/
│   └── views/
└── tests/
    ├── tests.html
    ├── browser-tests.js
    ├── test-suite.js
    └── run-node-tests.mjs
```

## Run the game

From inside the project directory:

```bash
cd diagonal-detective
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

When the server is started from the parent directory, open `http://localhost:8080/diagonal-detective/` instead.

A local HTTP server is preferred over `file://` because browser ES modules are subject to origin and CORS rules. HTTP gives modules a consistent origin and mirrors normal deployment behavior.

MathJax is vendored locally, so equation rendering does not require internet access.

## Tests

Run the pure Node test suite:

```bash
npm test
```

Open the in-browser runner:

```text
http://localhost:8080/tests/tests.html
```

The suite checks:

- direct, absent, indirect, and multiple-path dependencies;
- cycle detection;
- diagonal, identity, dense, sparse, permutation, zero-row, zero-column, block, and triangular classifications;
- structural versus evaluated zero metadata;
- symbolic derivatives and centered finite differences;
- ReLU active and inactive states;
- deterministic-case graph consistency;
- answer validation;
- state-schema validation;
- 2,000 seeded generated-case invariants.

## Numerical verification

For selected supported expressions, tests compare symbolic derivatives with

```text
[f(x + εeⱼ) - f(x - εeⱼ)] / (2ε),  ε = 10⁻⁵
```

Numerical differentiation is an internal verification technique, not the learner-facing explanation.

## Mastery and adaptation

The game records attempts, correctness, first-attempt correctness, hints, recent results, contexts, timestamps, and misconception counts per concept. A concept progresses through:

```text
not-introduced → introduced → needs-review/developing → mastered
```

Generated review adapts to repeated errors:

- square-means-diagonal → dense square cases;
- diagonal-means-identity → independent nonlinear cases;
- missed indirect dependency → intermediate-variable cases;
- evaluated-zero confusion → local-flat-spot cases;
- false dependency → sparse no-path cases.

Strong streaks introduce triangular, indirect, and dense cases.

## Accessibility

- semantic buttons, labels, tables, and headings;
- full keyboard operation for evidence connections;
- explicit non-drag Add/Remove Dependency controls;
- visible focus indicators;
- ARIA labels for each Jacobian cell;
- live-region feedback;
- text alternative for the learner’s current dependency graph;
- locally rendered equations with `role="math"` and descriptive context;
- non-colour symbols `●`, `0`, and `0*`;
- reduced-motion support and a manual toggle;
- larger-text toggle;
- touch-friendly controls;
- no mandatory timer.

## Security and code quality

- no `eval` or `new Function`;
- no inline event handlers;
- imported state is size-limited and schema-validated;
- generated graphs reject cycles and undeclared references;
- structural analysis is separate from symbolic and numerical evaluation;
- learner-entered derivative text is normalized for comparison and never executed;
- untrusted imported data is not inserted as executable HTML.

## Errata process

Add reported mathematical or behavioral issues to `ERRATA.md` before changing game behavior. Each entry records an ID, date, level, question, seed, expected behavior, actual behavior, mathematical impact, workaround, and status.

When a request says to log an issue only, update `ERRATA.md` and do not modify the game.

## Add a deterministic case

1. Add typed input, intermediate, and output definitions in `js/data/cases.js`.
2. Build expressions with constructors from `expression-model.js`.
3. Supply the expected symbolic Jacobian and selected derivative targets.
4. Add evaluation metadata only when point evaluation is useful.
5. Let `makeCase()` build the graph, dependency matrix, structural cells, and classifications.
6. Add or update tests for new mathematical behavior.

## Add a generated family

1. Add a pure family builder in `question-generator.js`.
2. Use only supported AST nodes and declared names.
3. Keep inputs and outputs between two and four.
4. Build the expected Jacobian independently from reachability.
5. Add the family to `generateCase()`.
6. Ensure it passes the 2,000-seed invariant sweep.

## Known limitations

- Free-form derivative answers use normalization and accepted equivalent forms; the game does not include a general computer-algebra equivalence engine.
- Generated expressions intentionally stay within small polynomial, affine, ReLU, and named-intermediate families.
- Block-diagonal detection is limited to small contiguous teaching partitions.
- The interaction is connectable rather than pointer-drag based. This keeps pointer and keyboard behavior equivalent.
- Adaptive review selects focused generated families but is not a full spaced-repetition scheduler.
