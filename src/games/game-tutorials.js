const commonFinish = (goal) => ({
  icon: '★',
  title: 'Check, learn, and advance',
  paragraphs: ['Submit each reasoning stage and read the targeted feedback. Correct work advances the round; an incorrect answer identifies the earliest idea to revisit.'],
  bullets: ['The HUD Hint button reveals help for the current task.', 'Restart resets this cabinet’s campaign.', 'Keyboard and button alternatives are available for drag interactions.'],
  callout: goal,
});

export const GAME_TUTORIALS = Object.freeze({
  'shape-sorter': {
    steps: [
      { icon: '◇', title: 'Sort the derivative by shape', paragraphs: ['Read what is being differentiated and identify the output object and input object before calculating anything.'], callout: 'Your mission: choose the derivative category and its exact dimensions.' },
      { icon: 'm×n', title: 'Outputs make rows; inputs make columns', rules: [
        { condition: 'scalar / scalar', derivative: '1 × 1', action: 'scalar', kind: 'pass' },
        { condition: 'scalar / vector n', derivative: '1 × n', action: 'row gradient', kind: 'pass' },
        { condition: 'vector m / scalar', derivative: 'm × 1', action: 'column', kind: 'pass' },
        { condition: 'vector m / vector n', derivative: 'm × n', action: 'Jacobian', kind: 'pass' },
      ], paragraphs: ['The entire arcade uses numerator layout. Never reverse the dimensions silently.'] },
      { icon: '↔', title: 'Use the sorter in order', bullets: ['Inspect the numerator output and denominator input.', 'Choose scalar, row, column, or matrix.', 'Enter exact rows and columns when requested.', 'Build the short explanation or compatible chain product.'] },
      commonFinish('Goal: complete the required nine levels; Shape Sprint remains optional review.'),
    ],
  },
  'partial-derivative-freeze': {
    steps: [
      { icon: '❄', title: 'Change one input; freeze the others', paragraphs: ['A partial derivative follows one selected input while treating every other independent input as constant.'], callout: 'Place the denominator variable in ACTIVE and every other independent input in FROZEN.' },
      { icon: '∂', title: 'Frozen does not mean deleted', bullets: ['A frozen multiplier can remain in the derivative as a constant factor.', 'Terms with no path from the active variable contribute zero.', 'A declared dependency such as y(x) remains active; an independent y does not.'], callout: 'Differentiate by dependency, not by the variable’s letter.' },
      { icon: '→', title: 'Complete the sensitivity chamber', bullets: ['Confirm the derivative shape.', 'Assign active and frozen variables.', 'Classify changing terms.', 'Choose local rule cards and assemble the derivative.', 'Review the dependency trace.'] },
      commonFinish('Goal: preserve every valid dependency while holding truly independent inputs fixed.'),
    ],
  },
  'build-jacobian': {
    steps: [
      { icon: 'J', title: 'Assemble scalar sensitivities into a matrix', paragraphs: ['Each Jacobian cell answers one question: how does output component i respond to input component j?'], callout: 'Build the whole Jacobian without swapping outputs and inputs.' },
      { icon: 'i,j', title: 'Read every cell by address', rules: [
        { condition: 'row i', derivative: 'output fᵢ', action: 'numerator', kind: 'pass' },
        { condition: 'column j', derivative: 'input xⱼ', action: 'denominator', kind: 'pass' },
        { condition: 'cell (i,j)', derivative: '∂fᵢ/∂xⱼ', action: 'local sensitivity', kind: 'pass' },
      ], paragraphs: ['A missing dependency is a structural zero; a derivative that happens to evaluate to zero can still have a dependency path.'] },
      { icon: '▦', title: 'Build in stages', bullets: ['Predict shape and label rows and columns.', 'Draw dependency wires and locate the requested cell.', 'Activate its input, freeze the others, and differentiate.', 'Place the value in the matching cell, then classify the completed matrix.'] },
      commonFinish('Goal: make shape, dependency, derivative value, and cell position agree.'),
    ],
  },
  'diagonal-detective': {
    steps: [
      { icon: '⌕', title: 'Investigate dependencies before derivatives', paragraphs: ['Treat the Jacobian as an evidence map. A cell can be nonzero only when a path connects its input column to its output row.'], callout: 'Trace the wires first; calculate selected slopes second.' },
      { icon: '0*', title: 'Tell two kinds of zero apart', rules: [
        { condition: 'no path', derivative: 'structural 0', action: 'remove the wire', kind: 'block' },
        { condition: 'path exists', derivative: 'evaluated 0*', action: 'keep the wire', kind: 'pass' },
      ], paragraphs: ['Square does not imply diagonal, and diagonal does not imply identity. Classify only what the evidence supports.'] },
      { icon: '🧵', title: 'Close the case file', bullets: ['Predict the output-by-input shape.', 'Connect each true input-output dependency.', 'Transfer evidence into the structural grid.', 'Mark zero types, calculate requested cells, and select every valid structure label.'] },
      commonFinish('Goal: expose exactly where sensitivities can exist and explain every zero.'),
    ],
  },
  'broadcast-factory': {
    steps: [
      { icon: '⇶', title: 'Track shared cargo across output lanes', paragraphs: ['A broadcast reuses one scalar variable in several output components. It does not create several independent scalar copies.'], callout: 'Identify the operation from operand types, then follow each structural dependency.' },
      { icon: '1⃗', title: 'One shared value creates repeated sensitivity', rules: [
        { condition: 'y=x+z', derivative: '∂y/∂z = 1⃗', action: 'one column', kind: 'pass' },
        { condition: 'y=x+z', derivative: '∂y/∂x = I', action: 'identity lanes', kind: 'pass' },
      ], paragraphs: ['Broadcast, element-wise multiplication, dot product, reduction, and matrix mixing have different dependency patterns even when their symbols look similar.'] },
      { icon: '🏭', title: 'Process each factory order', bullets: ['Classify the operand and operation types.', 'Predict output shape and forward values.', 'Wire inputs to every output they influence.', 'Predict derivative shape and assemble the Jacobian.', 'Inspect shared versus per-feature parameters.'] },
      commonFinish('Goal: recognize when one parameter is reused across lanes and derive the resulting repeated gradient structure.'),
    ],
  },
  'reduction-relay': {
    steps: [
      { icon: 'Σ', title: 'Carry sensitivity from many lanes to one scalar', paragraphs: ['A reduction combines a vector into fewer outputs, often one scalar, but every contributing input lane still receives a backward signal.'], callout: 'Build the forward relay, then distribute the upstream gradient back through it.' },
      { icon: '1×n', title: 'Keep the scalar gradient as a row', rules: [
        { condition: 'sum(x)', derivative: '[1 … 1]', action: 'all lanes', kind: 'pass' },
        { condition: 'mean(x)', derivative: '(1/n)[1 … 1]', action: 'scale all lanes', kind: 'pass' },
        { condition: 'incoming g', derivative: 'g · local derivative', action: 'multiply backward', kind: 'pass' },
      ], paragraphs: ['A dot product is element-wise multiplication followed by a sum; do not stop at its intermediate vector.'] },
      { icon: '🏁', title: 'Pass all seven checkpoints', bullets: ['Order the forward stages.', 'Carry the shape baton and calculate lane values.', 'Compute the scalar reduction.', 'Choose the differentiation target and derivative shape.', 'Place local derivatives, propagate upstream, and assemble the final gradient row.'] },
      commonFinish('Goal: deliver one correctly shaped gradient contribution to every input lane.'),
    ],
  },
  'chain-rule-circuit': {
    steps: [
      { icon: '⌁', title: 'Turn an expression into a gradient circuit', paragraphs: ['Break the expression into one-operation nodes, connect its dependencies, and attach one immediate derivative to each wire.'], callout: 'Trace every route from the requested input to output.' },
      { icon: '×+', title: 'Multiply serially; add parallel contributions', rules: [
        { condition: 'one route', derivative: 'multiply local factors', action: 'serial product', kind: 'pass' },
        { condition: 'several routes', derivative: 'add completed products', action: 'accumulate', kind: 'pass' },
      ], paragraphs: ['For matrices, the derivative nearest the output appears on the left. Compatible inner dimensions determine whether a chain product is valid.'] },
      { icon: '⚡', title: 'Repair the circuit in five stages', bullets: ['Decompose into assignments.', 'Connect the forward graph.', 'Label every wire with its local derivative and shape.', 'Trace every valid path.', 'Propagate, order products, accumulate branches, and submit the final derivative.'] },
      commonFinish('Goal: make the final derivative emerge from complete paths—not from a memorized shortcut.'),
    ],
  },
  'jacobian-tetris': {
    steps: [
      { icon: '▦', title: 'Build the Jacobian board in four phases', paragraphs: ['Each level combines derivative shape, dependency structure, piece family, and derivative values. Complete the current phase before the next becomes editable.'], callout: 'Fit the mathematical structure to the board instead of guessing from visual shape.' },
      { icon: '1→4', title: 'Follow the phase order', bullets: ['Board shape: enter output rows and input columns.', 'Dependencies: click every cell whose output depends on its input.', 'Piece family: select identity, diagonal, dense, reduction, broadcast, or another matching structure.', 'Derivative values: type into the revealed cells and check the phase.'] },
      { icon: 'Jᵀ', title: 'Respect structure and reverse-mode order', paragraphs: ['Structural zeros stay locked. In chain levels, arrange compatible blocks in output-to-input order. Reverse mode sends a column gradient through Jᵀ.'], callout: 'A correct-looking final matrix cannot repair a transposed board or a false dependency.' },
      commonFinish('Goal: certify all twelve boards by making shape, structure, values, and chain order agree.'),
    ],
  },
  'relu-gatekeeper': {
    steps: [
      { icon: '∇', title: 'Read one gate through the chain rule', paragraphs: ['Let a = ReLU(z). On the backward pass, ∂L/∂z = (∂L/∂a) × ReLU′(z).', 'This first trial isolates ReLU′(z), the local factor. The sign of z selects whether that factor is 1 or 0, so z determines whether the incoming gradient passes or is blocked.'], callout: 'For now, read z and decide the ReLU′(z) factor. Later work will focus on the incoming ∂L/∂a factor and on products across several gates.' },
      { icon: '0/1', title: 'Use the local ReLU derivative', rules: [
        { condition: 'z > 0', derivative: 'ReLU′(z) = 1', action: 'Pass the gradient', kind: 'pass' },
        { condition: 'z ≤ 0', derivative: 'ReLU′(z) = 0', action: 'Block the gradient', kind: 'block' },
      ], paragraphs: ['This arcade uses ReLU′(0)=0. ReLU output may be any positive value, but its derivative here is only 0 or 1.'] },
      { icon: 'J', title: 'Later trials add the other factors', bullets: ['The incoming ∂L/∂a is the other factor in the one-gate product.', 'Gate chains multiply that incoming gradient by several local derivatives; one zero factor blocks the path.', 'In hidden layers, select every neuron whose pre-activation is zero or negative.', 'Small positive values such as 0.01 survive; they are not dead neurons.'] },
      commonFinish('Goal: restore all four trials and identify exactly where gradients pass or disappear.'),
    ],
  },
  'gradient-descent-navigator': {
    steps: [
      { icon: '⌖', title: 'Navigate toward lower loss', paragraphs: ['The rover sits on a contour map of the loss landscape. Choose a direction and learning rate, then watch the parameter and loss traces.'], callout: 'Reach the target low-loss zone without crawling, oscillating, or leaving the map.' },
      { icon: '−∇', title: 'The gradient points uphill', rules: [
        { condition: '+∇L', derivative: 'increasing loss', action: 'uphill', kind: 'block' },
        { condition: '−η∇L', derivative: 'gradient descent', action: 'downhill step', kind: 'pass' },
      ], paragraphs: ['A tiny η moves safely but slowly. A large η can overshoot or diverge. Useful η depends on the local landscape.'] },
      { icon: 'η', title: 'Drive the optimizer', bullets: ['Choose Downhill or deliberately test Uphill.', 'Adjust η with the learning-rate slider.', 'Take one step to inspect cause and effect, or run eight steps.', 'Read the contour trace, current loss, and loss graph; reset when needed.'] },
      commonFinish('Goal: clear all six landscapes by selecting stable updates that reach their target loss.'),
    ],
  },
  'backpropagation-boss': {
    steps: [
      { icon: '◆', title: 'Route one loss gradient through the network', paragraphs: ['The tiny network is already evaluated forward. Repair it by choosing the local transformation needed on each backward edge.'], callout: 'Light every edge from Loss → Output → Hidden → Input, then deliver the parameter update.' },
      { icon: 'Jᵀ', title: 'Reuse the rules from earlier games', bullets: ['Loss derivative starts the incoming signal.', 'Wᵀg routes sensitivity to an earlier activation.', 'A ReLU mask blocks inactive lanes.', 'An outer product builds a weight-shaped gradient.', 'Broadcast reuse returns through a reduction.'] },
      { icon: '⇲', title: 'Select, place, and route', bullets: ['Choose or drag one transformation tile.', 'Place it in the Jacobian socket.', 'Select Route gradient.', 'Read the concise reason, then light the next edge.', 'The final mastery phase removes hints.'] },
      commonFinish('Goal: reconstruct the complete backward pass and prove that backpropagation is repeated local Jacobian composition.'),
    ],
  },
});

export function tutorialForGame(gameId) { return GAME_TUTORIALS[gameId] ?? null; }
