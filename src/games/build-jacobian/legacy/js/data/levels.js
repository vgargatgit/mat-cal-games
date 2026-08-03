export const LEVELS = [
  { id: 1, title: 'Rows Are Outputs', objective: 'Attach each scalar output component to one Jacobian row.', focus: ['row-output-mapping'] },
  { id: 2, title: 'Columns Are Inputs', objective: 'Attach each independent input component to one Jacobian column.', focus: ['column-input-mapping', 'shape-orientation'] },
  { id: 3, title: 'Find the Cell', objective: 'Translate Jᵢⱼ into row i, column j.', focus: ['entry-notation'] },
  { id: 4, title: 'Build One Jacobian Row', objective: 'Treat a row as the gradient of one scalar output.', focus: ['jacobian-row'] },
  { id: 5, title: 'Build One Jacobian Column', objective: 'Treat a column as all output responses to one input.', focus: ['jacobian-column'] },
  { id: 6, title: 'Complete a 2×2 Jacobian', objective: 'Calculate and place four scalar partial derivatives.', focus: ['partial-derivative-placement'] },
  { id: 7, title: 'Rectangular Jacobians', objective: 'Keep outputs as rows and inputs as columns when counts differ.', focus: ['rectangular-jacobian'] },
  { id: 8, title: 'Identity Jacobian', objective: 'Explain why copying inputs produces the identity matrix.', focus: ['identity-jacobian'] },
  { id: 9, title: 'Diagonal Jacobians', objective: 'Recognize independent element-wise dependencies.', focus: ['diagonal-jacobian'] },
  { id: 10, title: 'Sparse and Dense Jacobians', objective: 'Predict zeros from dependency paths before differentiating.', focus: ['sparse-jacobian', 'dense-jacobian', 'structural-zero'] },
  { id: 11, title: 'Evaluated Jacobians', objective: 'Separate a slope that is zero here from an absent dependency.', focus: ['evaluated-zero'] },
  { id: 12, title: 'Neural-Network Jacobians', objective: 'Build activation and affine-layer Jacobians.', focus: ['neural-network-jacobian'] },
  { id: 13, title: 'Jacobian Bug Hunter', objective: 'Diagnose transpose, placement, and zero-entry mistakes.', focus: ['transpose-detection', 'misconception-repair'] },
  { id: 14, title: 'Jacobian Assembly Challenge', objective: 'Complete an unfamiliar Jacobian without scaffolding.', focus: ['free-build', 'interpretation'] },
];

export const STAGE_LABELS = {
  shape: 'Predict shape',
  labels: 'Label rows & columns',
  locate: 'Find the cell',
  dependencies: 'Trace dependencies',
  build: 'Build Jacobian',
  classify: 'Classify structure',
  interpret: 'Interpret sensitivities',
  complete: 'Round complete',
};

export function stagesForRound(round) {
  switch (round.mode) {
    case 'rows-only': return ['shape', 'labels', 'complete'];
    case 'columns-only': return ['shape', 'labels', 'complete'];
    case 'find-cell': return ['shape', 'labels', 'locate', 'complete'];
    case 'row-only': return ['shape', 'labels', 'build', 'interpret', 'complete'];
    case 'column-only': return ['shape', 'labels', 'build', 'interpret', 'complete'];
    case 'repair': return ['shape', 'labels', 'dependencies', 'build', 'classify', 'interpret', 'complete'];
    case 'challenge': return ['shape', 'labels', 'dependencies', 'build', 'classify', 'interpret', 'complete'];
    default: return ['shape', 'labels', 'dependencies', 'build', 'classify', 'interpret', 'complete'];
  }
}
