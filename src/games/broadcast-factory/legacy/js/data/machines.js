export const MACHINES = [
  { type: 'vector-plus-scalar', name: 'Broadcast Add', silhouette: 'branch', description: 'One scalar branches into each vector lane.' },
  { type: 'scalar-times-vector', name: 'Scalar Scale', silhouette: 'scale', description: 'One scalar multiplies every vector lane.' },
  { type: 'vector-plus-vector', name: 'Element-wise Add', silhouette: 'paired', description: 'Matching vector components combine independently.' },
  { type: 'elementwise-multiply', name: 'Element-wise Multiply', silhouette: 'paired', description: 'Matching vector components multiply.' },
  { type: 'dot-product', name: 'Dot Product', silhouette: 'funnel', description: 'Two vectors reduce to one scalar.' },
  { type: 'matrix-vector', name: 'Matrix Mixer', silhouette: 'mixer', description: 'Rows combine many input lanes.' },
  { type: 'sum-reduction', name: 'Sum Funnel', silhouette: 'funnel', description: 'Many vector lanes reduce to one scalar.' },
  { type: 'shared-scale-shift', name: 'Shared Shift & Scale', silhouette: 'branch', description: 'One scale and one shift affect every lane.' },
  { type: 'per-feature-scale-shift', name: 'Per-feature Shift & Scale', silhouette: 'paired', description: 'Each feature has its own scale and shift.' }
];
