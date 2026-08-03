# Chain Rule Circuit errata

Use this log for confirmed mathematical, validation, rendering, or accessibility defects. When asked only to log an issue, record it here without changing game behaviour.

No confirmed errata are open in version 1.1.0.

## ERR-001 — Level 1 expression and computation graph described different functions

**Date identified:** 2026-08-02  
**Status:** Resolved in 1.1.0  
**Level:** Split the Expression  
**Question:** `level-1-sample-01`  
**Seed:** `N/A — deterministic round`

### Expected behaviour

The assignment `y=(x+1)^2`, its intermediate assignments, circuit nodes, local derivatives, path product, and final answer should all describe the same function.

### Actual behaviour

The mission displayed `y=(x+1)^2`, while the underlying graph and local-derivative data still represented the unrelated circuit `u=x^2`, `y=sin(u)`.

### Mathematical impact

A learner could construct the displayed expression correctly and then be asked to label wires for a different function. This breaks the central progression from expression decomposition to a faithful computation graph.

### Workaround

None was reliable because the learner-facing expression and validator source disagreed.

### Resolution

Level 1 now consistently uses `u=x+1`, `y=u^2`, local derivatives `1` and `2u`, ordered route product `2u·1`, and final derivative `2(x+1)`. Curriculum consistency tests cover the mapping.

---

## ERR-002 — Mixed scalar/vector level rendered an unrelated activation circuit

**Date identified:** 2026-08-02  
**Status:** Resolved in 1.1.0  
**Level:** Mixed Scalar and Vector Circuit  
**Question:** `level-21-sample-11`  
**Seed:** `N/A — deterministic round`

### Expected behaviour

The level objective `u=Ax`, `v=g(u)`, `s=Σvᵢ` should render the path `x → u → v → s` with local Jacobian shapes `(3×4)`, `(3×3)`, and `(1×3)` and the numerator-layout product:

```text
1ᵀ diag(g′(u)) A
```

### Actual behaviour

The level inherited a different element-wise activation graph, so its visible circuit did not match the declared mixed scalar/vector objective or final derivative.

### Mathematical impact

The learner could not use the graph to justify the required Jacobian order or the final `1×4` gradient shape.

### Workaround

None; the circuit topology itself was wrong.

### Resolution

The level now has explicit `x ∈ R⁴`, `u=Ax ∈ R³`, `v=g(u) ∈ R³`, and scalar `s` nodes; compatible derivative blocks; and a tested `(1×3)(3×3)(3×4) → 1×4` chain.

---

## ERR-003 — Correct final formula could conceal an incomplete circuit

**Date identified:** 2026-08-02  
**Status:** Resolved in 1.1.0  
**Level:** All graph-construction levels  
**Question:** `staged-validator`  
**Seed:** `All`

### Expected behaviour

Final validation should independently require a correct decomposition, exact forward topology, every local derivative, every dependency path, ordered route products, branch accumulation, incoming-gradient handling, and the final result.

### Actual behaviour

A learner could sometimes enter the correct final expression even while a forward wire was missing or a local derivative was wrong, and the result was accepted too generously.

### Mathematical impact

This could reward answer recall without demonstrating the computation-graph reasoning the game is designed to teach.

### Workaround

Manually inspect every stage before submitting.

### Resolution

Validation is now staged and structural. The first broken circuit element is reported, and tests explicitly verify that a correct final formula cannot hide a missing wire or an incorrect local derivative.


---

## ERR-004 — Negative ReLU round accepted an active-gate derivative

**Date identified:** 2026-08-02  
**Status:** Resolved in 1.1.0  
**Level:** ReLU Gate Circuit  
**Question:** `sample-12`  
**Seed:** `N/A — deterministic round`

### Expected behaviour

The deterministic circuit explicitly states `z < 0`, so `ReLU′(z)=0` and the only valid final derivative is `∂L/∂z=0`.

### Actual behaviour

The accepted-answer list also contained `2(a-y)`, which is the positive-input result for `z > 0` and omits the closed ReLU gate.

### Mathematical impact

The validator could accept a derivative that contradicts the displayed gate state and teach that a zero local derivative may be ignored.

### Workaround

Enter `0` for the deterministic negative-input circuit.

### Resolution

The negative-input round now accepts only `0`; its structural dependency remains visible and its local derivative block is still `0`.

---

## ERR-005 — Backward labels always used a loss numerator

**Date identified:** 2026-08-02  
**Status:** Resolved in 1.1.0  
**Level:** All backward-visualization rounds  
**Question:** `computation-graph-renderer`  
**Seed:** `All`

### Expected behaviour

A round requesting `dy/dx` should label returning node sensitivities as `∂y/∂x`, `∂y/∂u`, and `∂y/∂y`. Loss-based rounds should use `∂L/∂(·)`, and an injected upstream gradient should switch the numerator to `L`.

### Actual behaviour

The SVG renderer hard-coded `L` into every backward-gradient label, including ordinary scalar-composition rounds with no loss node.

### Mathematical impact

The diagram mixed two different derivative requests and could blur the distinction between a local total derivative and a loss gradient.

### Workaround

Use the mission’s requested derivative rather than the hard-coded SVG label.

### Resolution

The renderer now receives the round’s actual gradient numerator. Ordinary rounds use the selected output, while loss and incoming-gradient rounds use `L`. Local derivative badges also name both immediate variables, and backward wires are offset from forward wires for readability.


---

## ERR-006 — Mastery counters misreported first attempts and repeated hints

**Date identified:** 2026-08-02  
**Status:** Resolved in 1.1.0  
**Level:** Progress dashboard  
**Question:** `mastery-accounting`  
**Seed:** `All`

### Expected behaviour

`firstAttemptCorrect` should count a correct first submission for each new round, and each opened hint should be counted once even when the learner submits the same round more than once.

### Actual behaviour

First-attempt correctness was effectively limited to the concept’s first-ever attempt, while a hint already used in a round could be added to mastery totals again on every retry.

### Mathematical impact

The circuit mathematics was unaffected, but adaptive recommendations and mastery evidence could undercount independent first-attempt successes and overcount hint reliance.

### Workaround

Treat the old progress statistics as approximate.

### Resolution

Round-level first-attempt state and per-submission hint deltas are now recorded explicitly. Automated tests cover both counters.

---

## Entry template

## ERR-000 — Short issue title

**Date identified:** YYYY-MM-DD  
**Status:** Open  
**Level:** Level name  
**Question:** `question-id`  
**Seed:** `seed`

### Expected behaviour

Describe the mathematically correct or accessible behaviour.

### Actual behaviour

Describe the observed behaviour.

### Mathematical impact

Explain what the learner could infer incorrectly.

### Workaround

State a temporary workaround, or “None”.
