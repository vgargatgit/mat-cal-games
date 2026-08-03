# Duplicate code removed

The integration consolidates these formerly repeated application concerns:

- eight top-level navigation systems → one shell router;
- eight global progress entry points → one versioned `ProgressStore`;
- repeated mute and feedback tones → one `AudioManager`;
- repeated theme and reduced-motion toggles → one `ThemeManager`;
- repeated home, restart, hint, progress, star, and mute controls → one HUD;
- repeated buttons, cards, modal/dialogs, hints, progress bars, stars, loading, result, confetti, toast, and achievement UI → shared components;
- repeated shell colors, spacing, focus, animations, buttons, dialogs, and responsive rules → six shared stylesheets;
- three byte-identical MathJax SVG bundles plus two CDN references → one shared local runtime;
- repeated route-specific loading logic → one lazy game catalog and lifecycle adapter;
- repeated completion-to-next-game logic → one result and unlock pipeline.

Behavior-sensitive helpers such as seeded question generation, validators, scoring, symbolic simplification, and keyboard state machines remain within their games. Although some share generic names like `shuffle` or `scoreRound`, their constraints and outcomes are part of gameplay fidelity and are not treated as interchangeable without a cross-game behavioral specification.
