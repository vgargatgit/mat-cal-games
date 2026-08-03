# Partial Derivative Freeze — Local Errata Log

This log records confirmed defects without silently changing deterministic game behaviour. Use the question ID and seed to reproduce generated rounds.

## Current status

No confirmed mathematical or answer-validation errata were found in the initial implementation test sweep.

The automated suite currently passes 44/44 tests, including 2,000 generated-round invariants and numerical finite-difference checks for supported scalar rounds.

---

## Entry template

```markdown
## ERR-000 — Concise issue title

**Status:** Open  
**Date identified:** YYYY-MM-DD  
**Game:** Partial Derivative Freeze  
**Level:** N  
**Question:** `question-id`  
**Seed:** `seed`

### Expected

Describe the mathematically and pedagogically expected behaviour.

### Actual

Describe the observed behaviour.

### Mathematical impact

Explain whether the issue changes correctness, notation, shape, dependency interpretation, or only presentation.

### Workaround

Document a reproducible workaround, when known.
```
