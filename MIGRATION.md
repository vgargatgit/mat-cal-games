# Migration notes

All source snapshots were imported from their committed `HEAD`; `chain-rule-circuit` was refreshed from commit `ec163d8` after its final changes were pushed. The imported puzzle code lives under each module's `legacy/` directory. Only integration seams—storage namespaces and compatible shared MathJax references—were changed inside those snapshots.

| Journey | Source repository | Target module | Campaign marker |
|---:|---|---|---:|
| 1 | `vgargatgit/shape-sorter` | `src/games/shape-sorter` | 9 core levels; level 10 remains optional |
| 2 | `vgargatgit/pdf` | `src/games/partial-derivative-freeze` | 12 levels |
| 3 | `vgargatgit/build-jacobian` | `src/games/build-jacobian` | 14 levels |
| 4 | `vgargatgit/diagonal-detective` | `src/games/diagonal-detective` | 17 levels |
| 5 | `vgargatgit/broadcast-factory` | `src/games/broadcast-factory` | 18 levels |
| 6 | `vgargatgit/reduction-relay` | `src/games/reduction-relay` | 20 levels |
| 7 | `vgargatgit/chain-rule-circuit` | `src/games/chain-rule-circuit` | 22 levels |
| 8 | `vgargatgit/jacobian-tetris` | `src/games/jacobian-tetris` | 12 levels |

## Fidelity boundary

Each engine still owns its questions, seeded generators, stage transitions, validators, diagnostics, internal scoring, mastery calculations, and detailed practice persistence. The common adapter owns mounting and lifecycle, injects only shell-compatible presentation overrides, observes the game's saved campaign marker, and reports normalized progress to the shell.

This boundary is intentional: merging different symbolic parsers or scoring functions solely because their function names look similar would risk mathematical and pedagogical regressions. Purely presentational and application-wide concerns are shared; behavior-sensitive engine utilities remain with their tested game.

## Chapter III native modules

The final three games have no external source repository. They are native modules built directly on the arcade lifecycle:

| Chapter III | Module | Pure engine |
|---|---|---|
| ReLU Gatekeeper | `src/games/relu-gatekeeper/view.js` | `engine.js` gate, chain, and dead-neuron rules |
| Gradient Descent Navigator | `src/games/gradient-descent-navigator/view.js` | `engine.js` landscapes and update rules |
| Backpropagation Boss Battle | `src/games/backpropagation-boss/view.js` | `engine.js` 2→3→1 forward/backward pass |

Existing version-1 arcade progress migrates without reset. Eight completed games raise `unlockedLevel` to the Chapter III gateway automatically.

## Storage migration

Several standalone games used `matrixCalculusSuite.progress.v1` for incompatible root objects. In one origin, opening one game could erase another game's state. The arcade assigns every engine a stable unique key:

```text
arcade.legacy.<game-id>.v1
```

Arcade-wide state has a separate, validated schema. No old standalone key is deleted or mutated.

## Navigation changes

Standalone headers and footers are visually suppressed only inside the arcade host. Their DOM remains present for compatibility. Global navigation, progress, hints, sound, settings, and module transitions are provided by the shared shell. Directly opening a `legacy/index.html` file still runs the original standalone game.
