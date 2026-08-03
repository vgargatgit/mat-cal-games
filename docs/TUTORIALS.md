# Shared game tutorials

Every Matrix Calculus Arcade cabinet uses the same four-step tutorial component and the same first-run policy. Tutorials explain the actual game interaction without replacing the deeper guided instruction inside the preserved source games.

## Player behavior

- The tutorial opens automatically the first time a game reports that it is ready.
- Opening or dismissing it marks that game tutorial as seen.
- **Rules** in the shared HUD reopens the current tutorial at any time.
- **New Game** clears tutorial history along with campaign progress.
- Opening a tutorial pauses the active game; closing it resumes the game.
- Changing routes closes the dialog before destroying the game module.

Tutorial history is stored separately under `matrix-calculus-arcade.tutorials.v1`. It never changes stars, achievements, scores, game completion, or unlock progression. Existing ReLU tutorial completion is migrated into this record.

## Curriculum coverage

| Game | Tutorial focus |
|---|---|
| Shape Sorter | numerator-layout categories, exact dimensions, sorting flow |
| Partial Derivative Freeze | active variable, frozen inputs, dependency-based rules |
| Build the Jacobian | output rows, input columns, cell assembly |
| Diagonal Detective | evidence wires, structural versus evaluated zeros |
| Broadcast Factory | shared scalars, repeated lanes, operation-type distinctions |
| Reduction Relay | many-to-one flow, row gradients, upstream propagation |
| Chain Rule Circuit | graph construction, serial products, parallel accumulation |
| Jacobian Tetris | board phases, dependency cells, pieces, chain order |
| ReLU Gatekeeper | pass/block rules, chains, dead neurons |
| Gradient Descent Navigator | downhill direction, learning rate, live traces |
| Backpropagation Boss Battle | transformation tray, reverse routing, parameter gradients |

## Architecture

- `src/games/game-tutorials.js` is the single curriculum catalogue.
- `src/components/tutorial.js` renders the shared interaction.
- `src/app/tutorial/tutorial-store.js` owns versioned first-run state.
- `ArcadeShell` coordinates pause, resume, route cleanup, and replay from the HUD.

The catalogue uses structured text rather than raw HTML. This keeps tutorial rendering safe, consistent, testable, responsive, and compatible with high-contrast and reduced-motion modes.

Representative captures:

- `docs/screenshots/shape-sorter-tutorial-desktop.png`
- `docs/screenshots/relu-gatekeeper-tutorial-desktop.png`
- `docs/screenshots/game-hud-mobile.png`
