export const MISCONCEPTIONS = {
  'scalar-output-collapse': { title: 'Scalar output collapse', feedback: 'One operand is scalar, but the machine still produces one result for each vector lane. The output remains a vector.' },
  'scalar-independent-copies': { title: 'Independent-copy illusion', feedback: 'Broadcasting repeats the scalar’s influence, not the scalar variable. There is still only one scalar input column.' },
  'scalar-derivative-as-scalar': { title: 'Scalar derivative collapsed', feedback: 'Rows count output components. A vector output with respect to one scalar needs an n×1 column.' },
  'identity-for-scalar-derivative': { title: 'Identity used for shared scalar', feedback: 'Identity describes matching independent vector inputs. One shared scalar creates one full column.' },
  'ones-for-scaling': { title: 'Ones used for scaling', feedback: 'For yᵢ = z·xᵢ, the slope with respect to z is xᵢ, not 1.' },
  'missing-scalar-multiplier': { title: 'Frozen multiplier removed', feedback: 'When differentiating z·xᵢ with respect to xᵢ, z is frozen but remains as the multiplier.' },
  'dot-product-confusion': { title: 'Dot-product confusion', feedback: 'A dot product reduces two vectors to one scalar. Scalar-vector multiplication preserves all vector lanes.' },
  'matrix-confusion': { title: 'Matrix-mixing confusion', feedback: 'Element-wise operations use matching coordinates. Matrix multiplication can mix several inputs into every output.' },
  'shared-vector-bias-confusion': { title: 'Shared versus vector bias', feedback: 'A shared scalar bias creates one derivative column. A vector bias creates one independent input per output and an identity Jacobian.' },
  'diagonal-is-identity': { title: 'Diagonal mistaken for identity', feedback: 'Identity is one special diagonal matrix whose diagonal entries are all 1.' },
  'wrong-orientation': { title: 'Wrong orientation', feedback: 'Under numerator layout, vector output with respect to scalar input is n×1, not 1×n.' },
  'wrong-subtraction-sign': { title: 'Subtraction sign error', feedback: 'Operation order matters: d(x−z)/dz=−1 while d(z−x)/dx=−1.' },
  'dense-broadcast-dependency': { title: 'Dense vector dependency assumed', feedback: 'With respect to x, output yᵢ uses only xᵢ. The shared scalar affects every output, but nonmatching vector entries do not.' }
};
