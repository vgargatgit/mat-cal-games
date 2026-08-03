# Jacobian Tetris

Game 8 in the **All the Matrix Calculus You Need** learning-game suite.

## Launch

```bash
cd jacobian-tetris
python3 -m http.server 8080
```

Open `http://localhost:8080`.

No npm install, backend, network connection, or external equation renderer is required.

## Jacobian convention

For `y = f(x)`, with `x ∈ Rⁿ` and `y ∈ Rᵐ`:

- `J = ∂y/∂x` has shape `m × n`.
- Rows correspond to output components.
- Columns correspond to input components.
- `J[i,j] = ∂yᵢ/∂xⱼ`.

The game uses column gradients in reverse mode:

`∇ₓL = Jᵀ∇ᵧL`.

## Architecture

- `index.html` — suite shell and accessible landmarks
- `css/styles.css` — shared workshop visual language and responsive layout
- `js/levels.js` — data-driven campaign and piece definitions
- `js/math.js` — matrix shape, transpose, multiplication, canonical comparison, and validation utilities
- `js/storage.js` — namespaced localStorage persistence
- `js/app.js` — state transitions, rendering, interactions, feedback, practice mode, and browser tests

Gameplay truth is held in JavaScript state. The DOM renders from that state.

## Campaign

1. One Cell Drop
2. Identity Stack
3. Diagonal Drop
4. Dense Linear Wall
5. Reduction Beam
6. Scalar Broadcast Tower
7. Repeated Variable Trap
8. Selection Shuffle
9. Concatenation Dock
10. Chain Rule Drop
11. Vector–Jacobian Backprop
12. Jacobian Tetris Certification

## Controls

The board intentionally uses four guided steps:

1. **Board shape** — enter rows and columns.
2. **Dependencies** — do not type yet; click cells to mark which outputs depend on which inputs.
3. **Piece family** — choose the Jacobian structure in the Piece Queue.
4. **Derivative values** — the marked nonzero cells become real text inputs.

Each board cell now displays its current action (`LOCKED`, `CLICK / depends?`, `NONZERO? / piece first`, or a text input), so a blank cell is never mistaken for a broken editor.

A phase-specific **continue/check** button is also shown directly beneath the board, so the player does not need to search the right panel to advance. The HTML uses versioned CSS and JavaScript URLs to prevent an older cached interaction script from surviving a repository update.

- During **Derivative values**, every white Jacobian cell is a visible text input. Click or Tab into a cell and type directly.
- `Enter` inside a Jacobian input saves the entry and moves to the next editable cell; after the final cell it focuses **Check current phase**.
- Derivative tokens remain available: focus a Jacobian input first, then select a token.
- Mouse/touch: select dependency cells, pieces, value tokens, and chain blocks.
- `Enter`: check the current phase when focus is outside a form control.
- `U`: undo when focus is outside a form control.
- Reduced-motion toggle disables animated transitions.

## Tests

Select **Developer tests** in the footer. The panel checks core Jacobian shapes, identity, diagonal, reduction, broadcast, selection, matrix compatibility, chain order, and transpose-gate usage.

Regression commands:

```bash
node tests/math-regression.mjs
python3 tests/browser-input-regression.py
python3 tests/browser-campaign-regression.py
```

- `math-regression.mjs` validates utilities, matrix shapes, structural zeros, piece families, and chain compatibility for all levels.
- `browser-input-regression.py` reproduces the formerly ambiguous blank-cell screen, verifies the dependency prompt, then verifies real keyboard entry at desktop and phone widths.
- `browser-campaign-regression.py` completes all 12 campaign levels through the visible controls.

The browser tests require Python Playwright and Chromium. The game itself still has no external runtime dependencies.

Use `?debug=true` to show live game state and expected level data.

## Manual checklist

- Complete all phases of Levels 1–12 using visible controls.
- Deliberately enter a transposed board shape and verify targeted feedback.
- Mark a false dependency and verify structural-zero feedback.
- Select a dense piece for an element-wise map and verify diagnosis.
- Reverse Level 10 chain order and verify inner-dimension feedback.
- Verify Level 11 requires `Jᵀ` before the upstream column gradient.
- Reload after completing a level and verify score/progress persistence.
- Test at desktop, tablet, and mobile widths.
- Test keyboard focus and 200% browser zoom.
- Enable reduced motion and verify animation is removed.
