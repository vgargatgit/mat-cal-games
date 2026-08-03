# Partial Derivative Freeze

**Partial Derivative Freeze** is a self-contained browser game for learning partial derivatives through dependency reasoning. It follows the Shape Sorter game in a progressive matrix-calculus learning suite inspired by *The Matrix Calculus You Need for Deep Learning* by Terence Parr and Jeremy Howard.

The central mental model is:

> Move one selected independent input, hold the others fixed, and trace every path through which the selected input can still change the output.

The game makes the distinction between a **frozen multiplier** and an **independent term** visually explicit:

- In `x²y`, when differentiating with respect to `x`, `y` is frozen but remains as a multiplier, giving `2xy`.
- In `3y`, there is no dependency path from `x`, so the entire term contributes `0`.

## Architecture

1. A structured expression AST represents constants, variables, sums, products, powers, functions, and declared dependent variables.
2. A pure dependency engine decides whether each node changes with the selected active variable and finds computation-graph paths.
3. A symbolic derivative engine applies constant, power, sum, product, and scalar chain rules without inferring undeclared dependencies.
4. A simplifier and safe parser normalize structured and expert-entered answers; no `eval` or `new Function` is used.
5. A seeded generator creates deterministic practice families and adapts to repeated misconceptions.
6. Reusable UI components render the variable freezer, dependency scanner, SVG graph, sensitivity chamber, rule tray, builder, feedback, and progress views.
7. A versioned LocalStorage schema persists progress, mastery, misconceptions, settings, and the current round reference.
8. Browser and Node test runners verify derivatives, dependencies, equivalent answers, storage recovery, mastery, 2,000 generated rounds, and numerical finite differences.

## Mathematical assumptions

- Unless explicitly declared otherwise, variables shown as independent inputs are treated as mutually independent.
- A partial derivative changes only the denominator variable and holds other independent inputs fixed.
- A declared relationship such as `y = y(x)` creates an indirect dependency and requires an ordinary or total derivative contribution involving `dy/dx`.
- Multiplication by a frozen symbolic factor is handled as a constant multiple; a full product-rule expansion is also mathematically valid, but zero contributions are simplified away.
- Local derivatives multiply along one dependency path; contributions from separate paths are added.
- Scalar-output gradients use the paper’s **numerator layout**, so `∂f/∂x⃗` is a row vector.
- Generated foundational questions avoid division by variable expressions, nondifferentiable functions, and ambiguous dependency declarations.
- Trigonometric arguments are treated as dimensionless scalar quantities.

## Dependency representation

Expressions are trees such as:

```javascript
{
  type: "product",
  factors: [
    { type: "power", base: { type: "variable", name: "x" }, exponent: 2 },
    { type: "variable", name: "y" }
  ]
}
```

Declared dependencies use either a dedicated node:

```javascript
{
  type: "dependent-variable",
  name: "y",
  dependsOn: ["x"]
}
```

or a round context:

```javascript
{
  dependencies: {
    y: ["x"]
  }
}
```

The engine never assumes `y` means `y(x)` unless the round explicitly declares that relationship.

## Run the game

From the project directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A local HTTP server is preferred over `file://` because browsers restrict ES-module imports and related resource loading from local files. No backend, database, authentication, build step, or external API is required. MathJax is vendored under `vendor/mathjax` so equations work offline.

## Main interaction loop

A standard round asks the learner to:

1. Confirm the derivative shape.
2. place the differentiation variable in the **ACTIVE** zone.
3. freeze every other independent input.
4. classify which additive terms still change.
5. inspect dependency wires and a live sensitivity demonstration.
6. select derivative-rule cards.
7. assemble a structured or expert-entered derivative.
8. receive stage-specific, misconception-specific feedback.
9. review a worked dependency trace and gradient or neural-network connection.

All drag-style role placement has explicit button controls. Native buttons, radios, checkboxes, and text inputs support keyboard-only use.

## Level progression

1. **Constants Stay Still** — constant, identity, and constant-multiple rules.
2. **Freeze the Other Input** — independent multivariable inputs.
3. **Frozen Variables Can Remain** — symbolic frozen multipliers.
4. **Sum and Difference Scanner** — term-by-term dependency classification.
5. **Product Rule or Constant Multiple?** — dependency-driven rule choice.
6. **Nested Expressions** — intermediate variables and scalar chain rule.
7. **Independent or Dependent?** — `y` versus explicitly declared `y(x)`.
8. **Multiple Dependency Paths** — multiply along paths and add path contributions.
9. **Build a Gradient** — numerator-layout component assembly.
10. **Neural-Network Local Derivatives** — affine-neuron weights, inputs, and bias.
11. **Derivative Bug Hunter** — identify the first inconsistent derivation line.
12. **Freeze Challenge** — integrated, untimed mastery rounds.

All 15 required deterministic sample rounds are included, followed by seeded generated practice.

## Symbolic answer validation

The validator supports:

- reordered multiplication, such as `2xy`, `2yx`, and `y(2x)`;
- explicit or implicit multiplication;
- addition of zero and multiplication by one;
- reordered addition;
- simple factored or expanded equivalence checked numerically;
- derivative symbols such as `dy/dx`;
- safe numerical evaluation at several finite test points.

The parser supports the symbols generated by the game: single-letter variables, variables with numeric suffixes such as `w1` and `x2`, and `sin`, `cos`, and `exp`. Imported learner text is never executed.

## Question generation

`js/engine/question-generator.js` creates parameterized families for:

- constant-only and constant-multiple expressions;
- linear multivariable functions;
- frozen symbolic multipliers;
- multivariable polynomials;
- active products;
- nested powers and trigonometric functions;
- declared dependent variables;
- multiple-path graphs;
- gradients;
- affine neurons;
- bug-repair rounds.

Generated coefficients are small integers, powers are usually between 1 and 4, early rounds use two variables, advanced rounds use at most three paths, and randomness is deterministic for a given seed.

To add a family:

1. Construct the expression using the AST helpers from `js/math/expression-model.js` or `js/data/levels.js`.
2. Declare every variable and any functional dependency explicitly.
3. Call `makeRound(...)` so the expected derivative and term dependencies are generated by the math engine.
4. Add appropriate rules, hints, explanations, and misconception targets.
5. Add deterministic unit tests and include the family in the 2,000-question invariant sweep.

## Mastery and adaptation

Mastery is tracked independently for active-variable selection, numerical constants, freezing, frozen-multiplier retention, independent terms, derivative rules, declared dependencies, partial versus total derivatives, multiple paths, gradients, and neuron-local derivatives.

A concept reaches mastery only after repeated attempts, strong recent accuracy, first-attempt successes, no-hint successes, and more than one expression context. Repeated misconceptions influence the next generated practice family.

## Persistence and progress exchange

The LocalStorage root key is:

```text
matrixCalculusSuite.progress
```

The versioned schema is compatible with a wider learner object:

```javascript
{
  schemaVersion: 1,
  learner: {
    games: {
      partialDerivativeFreeze: {
        progress: {},
        mastery: {},
        misconceptions: {},
        currentRound: null
      }
    },
    settings: {}
  }
}
```

The dashboard supports export, validated import, reset, corrupted-storage recovery, reduced motion, and larger interface text.

## Testing

Run the Node test suite:

```bash
npm test
```

Or open the browser runner:

```text
http://localhost:8080/tests/tests.html
```

The suite covers:

- constant, constant-multiple, power, sum, product, and chain rules;
- independent and declared-dependent variables;
- frozen multipliers and active-variable switching;
- multiple dependency paths;
- gradient component order;
- neuron weight, input, and bias derivatives;
- symbolic equivalence and misconception detection;
- storage validation and recovery;
- mastery-state transitions;
- 2,000 generated-round invariants;
- central finite-difference checks with `ε = 10⁻⁵` for supported scalar rounds.

Current result: **44/44 automated tests pass**.

## Numerical verification

For supported independent-variable rounds, the test suite compares the symbolic derivative to:

```text
[f(x + ε, y) - f(x - ε, y)] / (2ε)
```

while keeping every frozen input unchanged. Declared-dependent rounds are skipped unless an explicit executable dependency function is supplied, because numerical verification must follow the declared relationship rather than treating the dependent variable as fixed.

## Accessibility

The project includes:

- semantic headings, fieldsets, labels, buttons, and status regions;
- visible focus outlines;
- keyboard alternatives for role placement;
- text descriptions for SVG dependency graphs;
- icon, text, border, and animation distinctions rather than colour alone;
- touch-sized controls;
- reduced-motion support from both system preferences and a saved setting;
- larger-text support;
- no required timed mode;
- MathJax output with source-level accessible labels on key equations;
- assertive announcements for validation and hints.

## Project structure

```text
partial-derivative-freeze/
├── index.html
├── README.md
├── ERRATA.md
├── IMPLEMENTATION_LOG.md
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
│   ├── data/
│   ├── math/
│   ├── engine/
│   ├── components/
│   └── views/
├── tests/
│   ├── tests.html
│   ├── run-node.mjs
│   └── JavaScript test suites
└── vendor/mathjax/
    ├── LICENSE
    └── es5/
```

## Errata process

Confirmed mathematical, validation, rendering, or accessibility defects should be recorded in `ERRATA.md` with a deterministic round ID or seed before behaviour is changed. This preserves reproducibility and follows the suite’s local errata-log convention.

## Known limitations

- Expert free entry intentionally supports the notation generated by this game rather than a complete computer-algebra language.
- Equivalent expressions requiring sophisticated identities, such as trigonometric transformations, are outside the validator’s current scope.
- Gradient rounds currently use two scalar input components; the underlying model can be extended to three.
- Imported progress preserves a compact current-round reference rather than arbitrary custom round code.
- The game teaches local derivatives and the backpropagation connection, but does not yet implement a full loss-to-parameter backpropagation level.
