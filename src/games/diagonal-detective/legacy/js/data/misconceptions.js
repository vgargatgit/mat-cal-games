export const MISCONCEPTIONS = {
  'square-means-diagonal': 'Equal input and output counts make the Jacobian square. Diagonal structure additionally requires every off-diagonal dependency to be absent.',
  'diagonal-means-identity': 'A diagonal Jacobian becomes identity only when every diagonal derivative equals one.',
  'all-vector-functions-elementwise': 'Vector notation does not guarantee coordinate-wise independence. Inspect each output formula for cross-input dependencies.',
  'missing-direct-dependency': 'The output explicitly uses this input, so the corresponding Jacobian cell cannot be structurally zero.',
  'false-dependency': 'There is no computation path from this input to this output. The corresponding derivative is structurally zero.',
  'missed-indirect-dependency': 'The input reaches the output through an intermediate variable. Dependency follows the computation graph, not only visible symbols.',
  'evaluated-zero-as-structural': 'The derivative happens to equal zero at this point, but a dependency path still exists.',
  'structural-as-local': 'There is no path at all. This entry is zero for every input value, not merely at the current point.',
  'relu-path-deletion': 'An inactive ReLU has a zero local derivative, but its output remains structurally connected to the matching input.',
  'off-diagonal-is-error': 'Off-diagonal entries are expected whenever an output depends on a nonmatching input.',
  'dense-equal-values': 'Dense structure means every dependency exists. The derivative values can still differ.',
  'missed-multiple-paths': 'More than one path connects this input to this output. Their derivative contributions add in one cell.',
  'dependency-is-jacobian': 'The dependency matrix records where derivatives may be nonzero. It does not contain the derivative values.',
  'transposed-structure': 'This game uses output rows and input columns.',
  'zero-row': 'A zero row means one output is insensitive to every input, often because it is constant.',
  'zero-column': 'A zero column means one input influences none of the outputs.'
};
