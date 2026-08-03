import { computeLocalDerivative } from '../js/math/symbolic-derivative.js';
import { numericalJacobian, matricesClose } from '../js/math/finite-difference.js';

const v = (name, values) => ({ name, semanticType: 'column-vector', length: values.length, values });
const s = (name, value) => ({ name, semanticType: 'scalar', value });

export async function registerDerivativeTests(t) {
  const cases = [
    ['broadcast add wrt vector','vector-plus-scalar',[v('x',[1,2,3]),s('z',5)],'x',[[1,0,0],[0,1,0],[0,0,1]]],
    ['broadcast add wrt scalar','vector-plus-scalar',[v('x',[1,2,3]),s('z',5)],'z',[[1],[1],[1]]],
    ['vector minus scalar wrt scalar','vector-minus-scalar',[v('x',[1,2]),s('z',5)],'z',[[-1],[-1]]],
    ['scalar minus vector wrt vector','scalar-minus-vector',[s('z',5),v('x',[1,2])],'x',[[-1,0],[0,-1]]],
    ['scalar scale wrt vector','scalar-times-vector',[s('z',-2),v('x',[3,-1,4])],'x',[[-2,0,0],[0,-2,0],[0,0,-2]]],
    ['scalar scale wrt scalar','scalar-times-vector',[s('z',-2),v('x',[3,-1,4])],'z',[[3],[-1],[4]]],
    ['element-wise add wrt second vector','vector-plus-vector',[v('x',[1,2]),v('v',[3,4])],'v',[[1,0],[0,1]]],
    ['element-wise multiply wrt x','elementwise-multiply',[v('x',[1,2,3]),v('v',[4,-1,2])],'x',[[4,0,0],[0,-1,0],[0,0,2]]],
    ['dot product wrt x','dot-product',[v('x',[1,3]),v('v',[2,4])],'x',[[2,4]]],
    ['shared scale wrt a','shared-scale-shift',[v('x',[2,-1,4]),s('a',3),s('b',-2)],'a',[[2],[-1],[4]]],
    ['shared shift wrt b','shared-scale-shift',[v('x',[2,-1,4]),s('a',3),s('b',-2)],'b',[[1],[1],[1]]],
    ['per-feature scale wrt gamma','per-feature-scale-shift',[v('x',[2,-1,4]),v('gamma',[1,2,-1]),v('beta',[0,1,3])],'gamma',[[2,0,0],[0,-1,0],[0,0,4]]],
    ['per-feature shift wrt beta','per-feature-scale-shift',[v('x',[2,-1,4]),v('gamma',[1,2,-1]),v('beta',[0,1,3])],'beta',[[1,0,0],[0,1,0],[0,0,1]]]
  ];
  for (const [name, operation, operands, target, expected] of cases) await t.test(name, () => t.deepEqual(computeLocalDerivative(operation, operands, target).matrix, expected));

  const finiteCases = [
    ['vector-plus-scalar',[v('x',[1.2,-2.1,3.4]),s('z',.7)],'z'],
    ['vector-minus-scalar',[v('x',[1.2,-2.1,3.4]),s('z',.7)],'x'],
    ['scalar-times-vector',[s('z',-1.7),v('x',[1.2,-2.1,3.4])],'z'],
    ['elementwise-multiply',[v('x',[1.2,-2.1,3.4]),v('v',[.5,2,-3])],'x'],
    ['shared-scale-shift',[v('x',[1.2,-2.1,3.4]),s('a',2.4),s('b',-.8)],'a'],
    ['per-feature-scale-shift',[v('x',[1.2,-2.1,3.4]),v('gamma',[.5,2,-3]),v('beta',[1,1,1])],'gamma']
  ];
  for (const [operation, operands, target] of finiteCases) await t.test(`finite difference verifies ${operation} wrt ${target}`, () => {
    const symbolic = computeLocalDerivative(operation, operands, target).matrix;
    const numerical = numericalJacobian(operation, operands, target);
    t.assert(matricesClose(numerical, symbolic, 1e-5), `${JSON.stringify(numerical)} != ${JSON.stringify(symbolic)}`);
  });
}
