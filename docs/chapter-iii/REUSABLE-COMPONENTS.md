# Reusable components and utilities

Chapter III reuses the arcade’s Button, HUD, ProgressBar, Stars, ResultScreen, Toast, Confetti, AudioManager, ThemeManager, Router, and ProgressStore.

- `Tutorial`
  - multi-step walkthrough built on the shared Modal;
  - keyboard-native Back, Next, Start, and Close controls;
  - step count and non-color progress indicators;
  - structured paragraphs, rules, lists, and callouts for all eleven games.

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
- `ChainRuleVisualizer`
  - accessible tokenized chain-rule product;
  - newly composed Jacobian animation;
  - per-step magnitude and vanishing/surviving/growing history;
  - wrapping presentation for products up to five layers.
- `inside-backprop-model.js`
  - pure forward/backward traversal state;
  - correctly ordered symbolic Jacobian composition;
  - depth/activation reset rules and gradient classification.

Game-specific visual pieces—ReLU gates, contour maps, transformation tiles, gradient sockets, network layers, and boss-health display—share arcade tokens and CSS but remain within the Chapter III game stylesheet section because their semantics are not generic application UI.
