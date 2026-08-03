# Repository Guidelines

## Project Structure & Module Organization

Shape Sorter is a dependency-free browser application built with native ES modules. `index.html` is the entry point, `css/app.css` contains all presentation styles, and `js/app.js` coordinates rendering and interaction. Keep reusable domain logic in `js/engine/` (generation, validation, scoring, mastery, and shape math), curriculum content in `js/data/`, and browser-facing concerns such as persistence and accessibility in the top-level `js/` modules. Automated tests live in `tests/*.test.js`; `tests/tests.html` provides browser smoke coverage.

## Build, Test, and Development Commands

- `python3 -m http.server 8080` — serve the repository locally; then open `http://localhost:8080`.
- `npm test` — run all Node tests using the built-in `node:test` runner.
- Open `http://localhost:8080/tests/tests.html` — run the browser smoke checks while the local server is active.

There is no compilation or bundling step. Avoid opening `index.html` through `file://`, because browser ES-module behavior and CORS restrictions vary.

## Coding Style & Naming Conventions

Use modern JavaScript modules, two-space indentation, semicolons, single-quoted strings, and trailing commas where they improve multiline readability. Name functions and variables with `camelCase`, constants with `UPPER_SNAKE_CASE`, and files with descriptive kebab-case names such as `question-generator.js`. Prefer small exported pure functions for engine logic. Preserve the numerator-layout convention: derivative shapes are output-by-input.

No formatter or linter is configured, so match nearby code and review diffs for consistency. Keep HTML semantic, controls keyboard-accessible, and visible text available alongside visual cues.

## Testing Guidelines

Use `node:test` and `node:assert/strict`. Name files `<feature>.test.js` and write behavior-focused test names, for example `test('transposes dimensions', ...)`. Add tests for normal cases, invalid inputs, and generator invariants. Changes to UI integration should also update or exercise `tests/tests.html`. The project has no numeric coverage threshold; protect all changed logic with focused tests.

## Commit & Pull Request Guidelines

This repository currently has no commit history, so no established message convention exists. Use concise, imperative subjects such as `Add chain-rule validation tests`, and keep each commit focused. Pull requests should explain the user-visible effect, list verification performed, and link related issues. Include screenshots or a short recording for visual changes, and call out accessibility, persistence-schema, or MathJax fallback impacts when relevant.

## Security & Data Handling

Do not introduce `eval`, inline event handlers, or unsanitized HTML. Validate imported progress JSON, and remember that user state is stored in `localStorage`; schema changes should remain backward-compatible or include an explicit migration.
