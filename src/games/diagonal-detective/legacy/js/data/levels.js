export const LEVELS = [
  ['Find the Evidence','Recognize direct dependencies from visible variables.'],
  ['No Path Means Zero','Translate missing paths into structural zeros.'],
  ['One-to-One Dependency','See the dependency pattern behind diagonal structure.'],
  ['Diagonal Is Not Identity','Separate location pattern from derivative values.'],
  ['Square Is Not Diagonal','Break the square-means-diagonal misconception.'],
  ['Cross-Component Influence','Detect off-diagonal dependencies.'],
  ['Sparse Detective','Recognize sparse but non-diagonal patterns.'],
  ['Dense Dependency Web','Find fully connected output-input structure.'],
  ['Indirect Dependency','Trace evidence through intermediates.'],
  ['Multiple Paths','Combine contributions that share a Jacobian cell.'],
  ['Zero Reasons','Separate structural and evaluated zeros.'],
  ['ReLU Evidence Board','Keep structural wires while local gates close.'],
  ['Feature Mixing','Compare element-wise processing with linear mixing.'],
  ['Block-Diagonal Cases','Find independent groups of coordinates.'],
  ['Triangular Cases','Recognize ordered structural patterns.'],
  ['Detective Bug Hunt','Repair realistic Jacobian misconceptions.'],
  ['Final Case File','Solve a mixed investigation without scaffolding.']
].map(([title,objective], index) => ({ id:index+1, title, objective, unlockedBy:index === 0 ? null : index }));
