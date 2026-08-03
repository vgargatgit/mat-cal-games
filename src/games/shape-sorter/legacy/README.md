# Shape Sorter

Shape Sorter is a browser-based matrix-calculus learning game. It teaches learners to determine derivative shapes before calculating derivative values.

The game uses the **numerator-layout convention**:

- rows correspond to output components;
- columns correspond to input components;
- for `f: R^n -> R^m`, `∂f/∂x` has shape `m × n`;
- a scalar loss differentiated with respect to an `n`-component vector is a `1 × n` row gradient.

## Features

- Ten progressive levels, from object recognition to neural-network derivative shapes.
- Drag-and-drop shape sorting with fully keyboard-accessible button alternatives.
- Exact dimension entry and short reasoning construction.
- Diagnostic feedback for reversed Jacobians, gradient orientation, scalar collapse, transpose errors, and chain incompatibility.
- Seeded generated questions plus fixed pedagogical sample rounds.
- Progressive hints and visual derivative-grid proofs.
- Per-concept mastery, misconception tracking, adaptive rectangular-Jacobian practice, and progress dashboard.
- LocalStorage persistence with JSON import/export.
- Reduced-motion and font-scale settings.
- MathJax rendering with readable plain notation if the CDN is unavailable.
- Node unit tests and a browser smoke-test page.

## Run

From this directory:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

A local HTTP server is preferred because the application uses JavaScript ES modules. Browser behaviour for modules opened through `file://` is inconsistent and often blocked by CORS rules.

## Test

Run the pure mathematical and generator tests:

```bash
npm test
```

With the HTTP server running, open the browser smoke tests:

```text
http://localhost:8080/tests/tests.html
```

## Learning sequence

1. **Meet the Shapes** — scalar, row vector, column vector, matrix.
2. **Scalar Derivatives** — scalar-to-scalar derivatives.
3. **Gradients** — vector-to-scalar row gradients.
4. **Scalar to Vector** — column derivatives.
5. **Build the Jacobian** — output rows and input columns.
6. **Transpose Traps** — orientation changes.
7. **Chain-Rule Builder** — compatible Jacobian products.
8. **Neural-Network Shapes** — weights, bias, activations, loss, and batch prediction Jacobians.
9. **Shape Bug Hunter** — realistic derivation repairs.
10. **Shape Sprint** — optional mixed review.

## Project structure

```text
shape-sorter/
├── index.html
├── package.json
├── README.md
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   ├── accessibility.js
│   ├── math-renderer.js
│   ├── state.js
│   ├── storage.js
│   ├── data/
│   │   ├── levels.js
│   │   └── notebook.js
│   └── engine/
│       ├── mastery.js
│       ├── question-generator.js
│       ├── scoring.js
│       ├── seeded-random.js
│       ├── shape-math.js
│       └── validator.js
└── tests/
    ├── tests.html
    ├── generator.test.js
    ├── mastery.test.js
    ├── shape-math.test.js
    └── validator.test.js
```

## Question generation

Questions are generated using a deterministic seeded pseudo-random generator. Every question includes:

- level and concepts;
- prompt and mathematical context;
- expected category and dimensions;
- progressive hints;
- worked explanation;
- metadata used for misconception diagnosis.

Generation constraints keep dimensions between 1 and 6 and validate every question's expected semantic category. Chain rounds explicitly distinguish compatible and intentionally incompatible products.

## Mastery

Each concept records attempts, correct answers, first-attempt correctness, hints, recent results, distinct contexts, misconceptions, and last-practised time.

A concept reaches `mastered` only after repeated success, at least two distinct contexts, and strong recent accuracy. A single correct answer is never enough.

## Accessibility

- Semantic buttons and landmarks.
- Visible keyboard focus.
- Button-based alternatives to drag-and-drop.
- Screen-reader live feedback.
- Reduced-motion support.
- Adjustable font scale.
- No mandatory timed progression.
- Text labels and dimensions in addition to visual shape icons.

## Adding a question family

1. Add a generator in `js/engine/question-generator.js`.
2. Return the normalized question schema used by `baseQuestion`.
3. Add concept identifiers in `js/data/levels.js`.
4. Add validator diagnostics when the family introduces a new misconception.
5. Add generator invariant tests.

## Security notes

- No `eval`, `new Function`, inline event handlers, backend, or authentication.
- Imported JSON is schema-validated before use.
- Imported strings are never inserted as executable HTML.
- Generated mathematical content is internal and passed through a controlled renderer.

## Known limitations

- MathJax is loaded from a CDN; equations remain understandable as source notation if the CDN is unavailable.
- Progress is local to one browser profile unless exported and imported.
- The optional Shape Sprint uses the same untimed interaction loop; a stricter countdown is intentionally omitted for accessibility.
