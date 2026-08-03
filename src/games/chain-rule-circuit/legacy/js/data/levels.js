export const LEVELS = [
  ['Split the Expression','Turn nesting into one-operation steps.','decomposition'],
  ['Build the Forward Circuit','Connect inputs toward outputs.','graph'],
  ['Label Local Derivatives','Attach one immediate slope per wire.','local-derivatives'],
  ['Multiply Along One Path','Combine a two-stage scalar chain.','single-path'],
  ['Longer Scalar Chain','Keep every serial gain in order.','long-chain'],
  ['Replace Intermediates','Return the answer to original variables.','simplification'],
  ['Incoming Gradient','Inject the later loss sensitivity.','incoming-gradient'],
  ['Two Paths from One Input','Accumulate two complete routes.','multiple-paths'],
  ['Multiply Within, Add Between','Choose the right circuit junction.','accumulation'],
  ['Shared Intermediate','Preserve every downstream contribution.','shared-intermediate'],
  ['Residual Addition','Include the identity skip path.','residual'],
  ['Product with Two Active Paths','Recover the product rule from routes.','product-rule'],
  ['Vector Chain Shape','Snap compatible Jacobian blocks.','shape'],
  ['Vector Chain Values','Multiply small Jacobians in order.','jacobian-values'],
  ['Element-wise Then Reduction','Compose a row gradient and diagonal Jacobian.','reduction'],
  ['Broadcast Then Reduction','Track one scalar through several lanes.','broadcast'],
  ['Diagonal Jacobian Shortcut','Scale independent gradient lanes.','diagonal'],
  ['ReLU Gate Circuit','Block a signal without deleting its wire.','relu'],
  ['Neuron Circuit','Backpropagate through affine, activation, and loss.','neuron'],
  ['Circuit Bug Hunter','Repair realistic chain-rule faults.','repair'],
  ['Mixed Scalar and Vector Circuit','Track shape changes across a reduction.','mixed'],
  ['Final Circuit Certification','Solve a complete unfamiliar circuit.','certification']
].map(([title, objective, concept], index) => ({
  level: index + 1,
  title,
  objective,
  concept,
  roundTypes: ['guided', 'generated', 'repair', 'mastery']
}));

export const LEVEL_BY_NUMBER = Object.fromEntries(LEVELS.map(level => [level.level, level]));
