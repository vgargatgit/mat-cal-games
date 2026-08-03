# Build the Jacobian — Local Errata Log

This file records mathematical, validation, rendering, accessibility, and question-generation issues. Logging an issue here does not imply that game behavior has been changed.

## Current status

No open mathematical errata are known in release `1.0.0`.

The automated suite passes all 25 test groups, including symbolic differentiation, Jacobian construction, misconception detection, numerical checks, persistence validation, and 2,000 generated-question invariants.

---

## Entry template

```markdown
## ERR-001 — Concise issue title

**Status:** Open  
**Date:** YYYY-MM-DD  
**Game:** Build the Jacobian  
**Level:** Level name or number  
**Question:** `question-id`  
**Seed:** `seed-value`

### Expected behavior

Describe the mathematically or pedagogically correct behavior.

### Actual behavior

Describe the observed behavior exactly.

### Mathematical impact

Explain whether the issue affects correctness, convention, equivalence, placement, dependency interpretation, or only presentation.

### Workaround

State a temporary learner or author workaround, if one exists.

### Status notes

Record investigation or resolution notes without deleting the original report.
```

---

## Closed implementation findings

These defects were found and corrected during pre-release validation. They are retained as a short engineering history rather than active errata.

### ERR-CLOSED-001 — ReLU derivative omitted the inner derivative

**Status:** Closed  
**Date:** 2026-08-01  
**Game:** Build the Jacobian  
**Level:** Neural-Network Jacobians  
**Question:** Generated activation family  
**Seed:** Multiple

#### Expected behavior

For `ReLU(g(x))`, symbolic differentiation must return `ReLU′(g(x)) · g′(x)`.

#### Actual behavior

The initial implementation returned only the local ReLU gate and omitted the chain-rule factor.

#### Mathematical impact

Generated activation derivatives would be incorrect for non-identity inner expressions.

#### Resolution

The chain-rule factor was added. Fixed rounds and all generated activation invariants now pass.

### ERR-CLOSED-002 — Wrong-cell misconception fixture formed a complete transpose

**Status:** Closed  
**Date:** 2026-08-01  
**Game:** Build the Jacobian  
**Level:** Jacobian Bug Hunter  
**Question:** Test fixture only  
**Seed:** Not applicable

#### Expected behavior

The fixture should isolate “correct derivative, wrong cell.”

#### Actual behavior

The first fixture accidentally represented the complete transpose, so the more specific transpose diagnosis correctly took precedence.

#### Mathematical impact

Application mathematics was unaffected; the misconception unit test was ambiguous.

#### Resolution

The fixture was changed to move one correct derivative to one incorrect cell without transposing the entire matrix.
