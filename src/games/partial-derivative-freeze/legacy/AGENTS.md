# Repository Guidelines

## Project Structure & Module Organization

This is a self-contained browser game built with native ES modules. `index.html` is the entry point; styles are split by purpose under `css/`. Application code lives in `js/`: keep pure mathematics in `js/math/`, gameplay orchestration in `js/engine/`, reusable DOM widgets in `js/components/`, page-level rendering in `js/views/`, and round definitions in `js/data/`. Tests live in `tests/` and mirror those concerns with files such as `derivative-tests.js` and `storage-tests.js`. MathJax is vendored in `vendor/mathjax/`; do not hand-edit generated vendor files.

## Build, Test, and Development Commands

- `npm test` runs the complete Node-based test suite through `tests/run-node.mjs`.
- `npm run serve` starts a static server on port 8080. Open `http://localhost:8080` to play or `/tests/tests.html` for the browser runner.

There is no compilation or bundling step. Use the HTTP server rather than `file://`, because browser ES-module loading is restricted from local files.

## Coding Style & Naming Conventions

Use modern JavaScript with ES module `import`/`export`, two-space indentation, semicolons, and single quotes. Prefer small, pure functions for symbolic math and dependency logic; never evaluate learner input with `eval` or `new Function`. Use `camelCase` for variables and functions, `PascalCase` for classes, and kebab-case filenames (for example, `answer-validator.js`). Keep accessibility behavior intact when changing UI: semantic controls, keyboard alternatives, status announcements, reduced motion, and non-colour cues are expected. No automated formatter or linter is configured, so match nearby code.

## Testing Guidelines

Tests use the repository’s lightweight harness in `tests/test-utils.js`, not an external framework. Add focused cases to the closest `*-tests.js` suite and register new suites in `tests/runner.js` when needed. Mathematical changes should cover exact symbolic behavior, equivalent notation, and relevant generated-round invariants. Run `npm test` before submitting; also exercise the browser runner for DOM, rendering, or accessibility changes.

## Mathematical Defects & Reproducibility

Record confirmed mathematical, validation, rendering, or accessibility defects in `ERRATA.md` with a deterministic round ID or seed before changing behavior. Declare variable dependencies explicitly; never infer that `y` means `y(x)`.

## Commit & Pull Request Guidelines

This repository currently has no commit history from which to infer a convention. Use short, imperative subjects, optionally scoped, such as `math: handle multiple dependency paths`. Keep commits focused. Pull requests should explain the learner-visible impact, list test commands and results, link relevant issues or errata entries, and include screenshots for UI changes.
