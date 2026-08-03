export const LEVELS = [
  { id: 1, title: 'Meet the Shapes', subtitle: 'Classify scalars, row vectors, column vectors, and matrices.', concepts: ['object-recognition', 'transpose'], rounds: 6 },
  { id: 2, title: 'Scalar Derivatives', subtitle: 'Recognize when a derivative really is a scalar.', concepts: ['scalar-derivative'], rounds: 6 },
  { id: 3, title: 'Gradients', subtitle: 'Build row-vector gradients under numerator layout.', concepts: ['vector-to-scalar', 'gradient-orientation'], rounds: 7 },
  { id: 4, title: 'Scalar to Vector', subtitle: 'A scalar input creates one column, not one output.', concepts: ['scalar-to-vector'], rounds: 7 },
  { id: 5, title: 'Build the Jacobian', subtitle: 'Outputs become rows; inputs become columns.', concepts: ['vector-to-vector', 'jacobian-order'], rounds: 8 },
  { id: 6, title: 'Transpose Traps', subtitle: 'Track row and column orientation explicitly.', concepts: ['transpose', 'orientation'], rounds: 7 },
  { id: 7, title: 'Chain-Rule Builder', subtitle: 'Join compatible Jacobian blocks in the right order.', concepts: ['chain-compatibility', 'chain-order'], rounds: 8 },
  { id: 8, title: 'Neural-Network Shapes', subtitle: 'Apply shape reasoning to neurons, loss, and batches.', concepts: ['neural-shapes', 'gradient-orientation'], rounds: 8 },
  { id: 9, title: 'Shape Bug Hunter', subtitle: 'Find and repair realistic shape mistakes.', concepts: ['diagnosis', 'jacobian-order', 'orientation'], rounds: 8 },
  { id: 10, title: 'Shape Sprint', subtitle: 'Optional rapid practice across every shape family.', concepts: ['mixed-review'], rounds: 12, optional: true }
];

export const CONCEPT_LABELS = {
  'object-recognition': 'Object recognition',
  'transpose': 'Transpose handling',
  'scalar-derivative': 'Scalar-to-scalar derivatives',
  'vector-to-scalar': 'Vector-to-scalar gradients',
  'gradient-orientation': 'Gradient orientation',
  'scalar-to-vector': 'Scalar-to-vector derivatives',
  'vector-to-vector': 'Vector-to-vector Jacobians',
  'jacobian-order': 'Output rows / input columns',
  'orientation': 'Row-column orientation',
  'chain-compatibility': 'Chain-rule compatibility',
  'chain-order': 'Chain-rule order',
  'neural-shapes': 'Neural-network derivative shapes',
  'diagnosis': 'Shape error diagnosis',
  'mixed-review': 'Mixed shape review'
};
