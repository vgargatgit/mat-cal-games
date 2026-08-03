# Reusable components and utilities

Chapter III reuses the arcade’s Button, HUD, ProgressBar, Stars, ResultScreen, Toast, Confetti, AudioManager, ThemeManager, Router, and ProgressStore.

New reusable pieces are intentionally small:

- `training-runtime.js`
  - versioned namespaced state store;
  - accessible live-region announcement helper;
  - shared star threshold calculation.
- `utils/dom.js`
  - now creates HTML and SVG elements in the correct namespace, allowing native interactive diagrams without a rendering dependency.
- `gradient-descent-navigator/engine.js`
  - data-driven landscape contract;
  - pure gradient step and multi-step trace functions.
- `backpropagation-boss/engine.js`
  - small matrix-vector and transpose utilities;
  - inspectable forward/backward pass used by the game and tests.
- `InsideBackprop`
  - configurable layer/activation explorer suitable for later initialization, normalization, and residual-network lessons.

Game-specific visual pieces—ReLU gates, contour maps, transformation tiles, gradient sockets, network layers, and boss-health display—share arcade tokens and CSS but remain within the Chapter III game stylesheet section because their semantics are not generic application UI.
