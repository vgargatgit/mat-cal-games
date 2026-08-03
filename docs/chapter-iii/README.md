# Chapter III — Learning to Train a Network

Chapter III is the graduation arc of Matrix Calculus Arcade. The original eight games teach the local rules. These three games ask learners to combine those rules into the forward–backward–update loop used to train a neural network.

The story follows one broken ancient network:

- its neurons have forgotten when to transmit gradients;
- its optimizer has lost the downhill direction;
- its full computation graph can no longer assemble a backward pass.

The chapter deliberately avoids presenting backpropagation as a new algorithm to memorize. Every answer is a rule the learner has already practised: a local derivative, diagonal Jacobian, transpose multiply, outer product, broadcast reduction, or gradient-descent update.

## Educational objectives

### ReLU Gatekeeper

Learners begin with a four-step, replayable tutorial covering the mission, the two local derivative rules, chain and hidden-layer rounds, feedback, hints, and stars. They then distinguish ReLU output from ReLU derivative, predict whether single and serial gradient paths survive, and identify dead neurons from pre-activations. The final explanation reconnects the mechanic to a diagonal activation Jacobian containing zeros and ones.

### Gradient Descent Navigator

Learners use the gradient as a direction rather than calculating it. Six landscapes isolate downhill direction, step size, curvature, plateaus, local information, and overshooting. The contour map, parameter trace, and loss trace update from the same state.

### Backpropagation Boss Battle

Learners manually route a real backward pass through a 2→3→1 network. Each correct local transformation lights the corresponding edge and reveals one concise reason. The mastery phase removes hints and includes parameter gradients, broadcast reduction, and the final weight update.

### Inside Backpropagation

The unlocked sandbox varies depth from one to five layers and switches among ReLU, sigmoid, tanh, and linear activations. Forward stepping follows value flow. Each backward step animates one local Jacobian into the correctly ordered chain-rule product, lights the matching network edge, and records the new illustrative gradient magnitude as vanishing, surviving, or growing. The completed expression visibly resolves from the output loss gradient to the input gradient.

## Screenshots

- `docs/screenshots/chapter-iii-map-desktop.png`
- `docs/screenshots/relu-gatekeeper-tutorial-desktop.png`
- `docs/screenshots/relu-gatekeeper-desktop.png`
- `docs/screenshots/gradient-descent-desktop.png`
- `docs/screenshots/backprop-boss-desktop.png`
- `docs/screenshots/inside-backprop-desktop.png`
- `docs/screenshots/inside-backprop-mobile.png`
