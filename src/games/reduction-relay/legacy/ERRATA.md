# Reduction Relay Errata

This file records defects found during exploratory play. All findings from the 2026-08-02 audit are resolved and protected by automated or browser-playthrough tests.

## ERR-001 — Reduction axes were conceptual only

**Status:** Closed — 2026-08-02

Level 19 now presents a generated rectangular matrix, asks the learner to choose row, column, or global reduction, validates the resulting shape, and validates every output value. `computeAxisReduction` supplies pure, explicit-axis semantics and rejects ragged inputs.

## ERR-002 — Maximum reduction was contrast-only

**Status:** Closed — 2026-08-02

Maximum is now an explicit operation in value, shape, pipeline, derivative, persistence, generation, and UI layers. Level 18 mastery generates a unique-maximum backward round. Tied maxima are rejected as nondifferentiable rather than assigned an arbitrary gradient.

## ERR-003 — Symbolic derivative tiles produced unparseable answers

**Status:** Closed — 2026-08-02

The derivative parser now evaluates fractions, `g`, indexed `x`, `y`, and `w` symbols, doubled variables, products, and Unicode subscripts from round data. Browser play confirms `[1/3, 1/3, 1/3]` assembled from tiles completes Mean Station.

## ERR-004 — Loss and error rounds displayed target `x`

**Status:** Closed — 2026-08-02

Guided and generated rounds now preserve the semantic targets `losses`/`ℓ` and `e` in prompts, formulas, given values, and the target control.

## ERR-005 — Shape Baton revealed answers before prediction

**Status:** Closed — 2026-08-02

The text alternative now reports only the learner’s current predictions, using `?` for unanswered stages. Guided mode gives a conceptual clue without printing the expected shape chain.

## ERR-006 — Sum versus Mean contained only a mean task

**Status:** Closed — 2026-08-02

Level 5 guided and generated rounds now include a same-vector comparison checkpoint for both scalar outputs and both numerator-layout gradient rows.

## ERR-007 — Tutorial was a slideshow

**Status:** Closed — 2026-08-02

All nine tutorial steps now require a mathematical choice. Next remains disabled until the learner answers correctly, feedback is announced, and completion enters the game.

## ERR-008 — Retry was credited as first-attempt mastery

**Status:** Closed — 2026-08-02

Mastery records exactly one outcome per round: its first submission. Later retries can complete the round but cannot increase attempts, recent results, or `firstAttemptCorrect`.

## ERR-009 — Named misconceptions fell through to generic feedback

**Status:** Closed — 2026-08-02

Diagnostics now distinguish identity-for-sum, sum divided by `n`, weighted ones, square ones, final diagonal dot Jacobian, wrong operand, wrong order, upstream omission/addition, one-lane routing, and swapped lanes. The UI passes the complete submitted object to diagnosis while still identifying the earliest inconsistent checkpoint.

## ERR-010 — Deterministic samples omitted comparison/symbolic data

**Status:** Closed — 2026-08-02

`sample-8` explicitly stores `diag(y)`, the sum Jacobian, and the final row. `sample-16` explicitly stores symbolic upstream `g`, symbolic coefficients, and `g yᵀ`, alongside its numeric instance.

## ERR-011 — Practice and mastery had identical scaffolding

**Status:** Closed — 2026-08-02

Guided mode includes a conceptual clue, practice includes derivative tiles and hints, and mastery removes both tiles and hints. Browser tests verify this distinction on all 20 levels.

## ERR-012 — Repair generation covered only two faults

**Status:** Closed — 2026-08-02

Repair rounds now inject level-appropriate faults across thirteen categories, including missing reduction, identity-for-sum, omitted upstream gradient, missing/double mean scaling, swapped lanes, wrong stage order, wrong dot operand, final diagonal Jacobian, square-as-ones, one-lane routing, wrong orientation, and sum-for-mean. Browser play verifies every supplied state fails and can be repaired.

## Remaining known limitations

- Level 19 supports arbitrary rectangular 2D matrices, not tensors of rank greater than two.
- Maximum rounds intentionally require a unique maximum; subgradient conventions at ties are not taught.
- Matrix-mix stages remain outside the scalar/vector relay subset.
