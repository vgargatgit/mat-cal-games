export const LEVELS = [
  { id: 1, title: 'Meet the Factory Cargo', objective: 'Distinguish scalars, vectors, and matrices.', families: ['vector-plus-scalar'], focus: 'types', icon: '◼' },
  { id: 2, title: 'Expand the Scalar', objective: 'Route one scalar influence into every output lane.', families: ['vector-plus-scalar', 'scalar-plus-vector'], focus: 'forward', icon: '↗' },
  { id: 3, title: 'Output Shape Inspector', objective: 'Predict why scalar-vector operations preserve vector shape.', families: ['vector-plus-scalar', 'scalar-times-vector'], focus: 'shape', icon: '▣' },
  { id: 4, title: 'Broadcast Addition Dependencies', objective: 'Wire matching vector lanes and one shared scalar column.', families: ['vector-plus-scalar'], focus: 'dependencies', icon: '⑂' },
  { id: 5, title: 'Differentiate Broadcast Addition', objective: 'Build identity and ones-column derivatives.', families: ['vector-plus-scalar', 'scalar-plus-vector'], focus: 'derivative', icon: '∂' },
  { id: 6, title: 'Scale Every Lane', objective: 'Compute scalar-times-vector outputs.', families: ['scalar-times-vector', 'vector-times-scalar'], focus: 'forward', icon: '×' },
  { id: 7, title: 'Differentiate Scalar Scaling', objective: 'Build zI and x-column derivatives.', families: ['scalar-times-vector', 'vector-times-scalar'], focus: 'derivative', icon: '∂×' },
  { id: 8, title: 'Vector Plus Vector', objective: 'Contrast one shared scalar with independent vector components.', families: ['vector-plus-vector', 'vector-minus-vector'], focus: 'compare', icon: '＋' },
  { id: 9, title: 'Element-Wise Multiplication', objective: 'Build diagonal Jacobians from matching-coordinate products.', families: ['elementwise-multiply'], focus: 'derivative', icon: '⊙' },
  { id: 10, title: 'Addition versus Multiplication Detective', objective: 'Explain why broadcast add and scale have different derivatives.', families: ['vector-plus-scalar', 'scalar-times-vector'], focus: 'compare', icon: '⌕' },
  { id: 11, title: 'Broadcast versus Dot Product', objective: 'Separate vector-preserving scale from scalar reduction.', families: ['scalar-times-vector', 'dot-product'], focus: 'compare', icon: '↓' },
  { id: 12, title: 'Broadcast versus Matrix Mixing', objective: 'Separate lane matching from dense feature mixing.', families: ['vector-plus-scalar', 'matrix-vector'], focus: 'compare', icon: '▦' },
  { id: 13, title: 'Bias Addition in a Neuron Layer', objective: 'Compare shared scalar bias with vector bias.', families: ['vector-plus-scalar', 'vector-plus-vector'], focus: 'application', context: 'bias', icon: 'b' },
  { id: 14, title: 'Learned Gates and Feature Scaling', objective: 'Compare a shared gate with per-feature gates.', families: ['scalar-times-vector', 'elementwise-multiply'], focus: 'application', context: 'gate', icon: 'g' },
  { id: 15, title: 'Shift and Scale', objective: 'Differentiate y=ax+b with shared scalar parameters.', families: ['shared-scale-shift'], focus: 'composite', icon: '⇅' },
  { id: 16, title: 'Per-Feature Shift and Scale', objective: 'Differentiate γ⊙x+β with vector parameters.', families: ['per-feature-scale-shift'], focus: 'composite', icon: 'γ' },
  { id: 17, title: 'Factory Bug Hunter', objective: 'Diagnose realistic broadcasting and Jacobian mistakes.', families: ['vector-plus-scalar', 'vector-minus-scalar', 'scalar-minus-vector', 'scalar-times-vector', 'elementwise-multiply', 'elementwise-divide'], focus: 'repair', icon: '⚠' },
  { id: 18, title: 'Final Factory Certification', objective: 'Solve unfamiliar local broadcast operations without scaffolding.', families: ['shared-scale-shift', 'per-feature-scale-shift', 'vector-plus-scalar', 'vector-minus-scalar', 'scalar-minus-vector', 'scalar-times-vector', 'elementwise-multiply', 'elementwise-divide', 'sum-reduction', 'matrix-vector', 'dot-product'], focus: 'challenge', icon: '★' }
];

export function getLevel(id) { return LEVELS.find((level) => level.id === Number(id)); }
