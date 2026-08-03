# Matrix Calculus Arcade

Matrix Calculus Arcade turns eight complete learning games into one progressive product. The shared shell owns navigation, unlocks, accessibility preferences, audio, achievements, stars, the concept encyclopedia, pedagogical result screens, and the final **Matrix Calculus Mastery** synthesis. Puzzle engines remain faithful to their source repositories.

## Run locally

```bash
npm run serve
```

Open `http://localhost:8080`. The application uses native ES modules and has no install or build step.

```bash
npm test       # shell and module-contract tests
npm run check  # JavaScript syntax checks
```

## Architecture

```text
src/
├── app/
│   ├── audio/        # one AudioManager and persistent mute state
│   ├── progress/     # versioned arcade-wide localStorage schema
│   ├── router/       # shell-owned hash navigation
│   ├── shell/        # landing, map, game host, settings, results, mastery
│   └── theme/        # light, dark, contrast, and reduced-motion preferences
├── components/       # buttons, cards, dialog/modal, HUD, stars, toast, hint,
│                     # progress, confetti, results, loading, achievements
├── games/
│   ├── game-data.js  # curriculum and pedagogy metadata
│   ├── catalog.js    # lazy module imports
│   ├── legacy-game-module.js # shared GameModule adapter
│   └── <game>/       # module.js plus the preserved puzzle engine
├── assets/           # shared runtime assets
├── styles/           # six purpose-specific shared stylesheets
└── utils/            # focused DOM and math utilities
```

Every cabinet exports the same lifecycle contract:

```js
{
  id,
  title,
  description,
  difficulty,
  create(container, context),
  destroy(),
  pause(),
  resume()
}
```

The shell lazy-loads a cabinet only after route and progression checks. The adapter mounts the original game in a same-origin frame to preserve its DOM, engine state, keyboard behavior, scoring, and mathematical validation. It suppresses redundant source chrome and reports campaign progress back to the shared HUD. Games never import or call the router.

## Progress and privacy

Arcade state is stored under `matrix-calculus-arcade.progress.v1`. It records the unlocked module, stars, achievements, best scores, reinforced concepts, completion state, play statistics, and settings. Each game retains its detailed practice state under a unique `arcade.legacy.*` key. This isolation fixes collisions in the original standalone storage schemas.

No learner data leaves the browser. **New Game** resets arcade progression and all eight detailed campaign records after confirmation; each original game also exposes its own reset control where appropriate.

## Design decisions

- Gameplay was not rewritten. The integration boundary protects mature mathematical engines and their tests while the common adapter eliminates eight shell implementations.
- The numerator-layout convention and each source game's explicit assumptions remain unchanged.
- Shared chrome is outside the game frame. That gives every game the same Home, Restart, Hint, Stars, Progress, and Mute controls without coupling engines to navigation.
- Animations are short, decorative, and disabled by either system preference or the arcade setting.
- A shared vendored MathJax runtime replaces duplicate bundles and CDN dependencies where the source runtime is compatible.
- Free Play changes only arcade route authorization; it does not fabricate campaign completion.

See [MIGRATION.md](./MIGRATION.md) for source-to-target mapping and [DUPLICATION.md](./DUPLICATION.md) for the consolidation record.

## Browser support

The layout supports desktop, laptop, tablet, and mobile orientations down to 320 px. Current evergreen browsers are expected. Keyboard navigation, visible focus, semantic landmarks, live regions, high contrast, and reduced motion are supported.
