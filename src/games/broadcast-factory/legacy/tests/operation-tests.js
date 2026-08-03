import { evaluateOperation } from '../js/math/numeric-evaluator.js';
import { computeOutputShape, inferOperation } from '../js/math/operation-model.js';

const v = (name, values) => ({ name, semanticType: 'column-vector', length: values.length, values });
const s = (name, value) => ({ name, semanticType: 'scalar', value });

export async function registerOperationTests(t) {
  await t.test('vector plus scalar values', () => t.deepEqual(evaluateOperation('vector-plus-scalar', [v('x',[1,2,3]),s('z',5)]), [6,7,8]));
  await t.test('scalar plus vector values', () => t.deepEqual(evaluateOperation('scalar-plus-vector', [s('z',5),v('x',[1,2,3])]), [6,7,8]));
  await t.test('vector minus scalar values', () => t.deepEqual(evaluateOperation('vector-minus-scalar', [v('x',[1,2,3]),s('z',2)]), [-1,0,1]));
  await t.test('scalar minus vector values', () => t.deepEqual(evaluateOperation('scalar-minus-vector', [s('z',2),v('x',[1,2,3])]), [1,0,-1]));
  await t.test('scalar times vector values', () => t.deepEqual(evaluateOperation('scalar-times-vector', [s('z',-2),v('x',[3,-1,4])]), [-6,2,-8]));
  await t.test('element-wise multiply values', () => t.deepEqual(evaluateOperation('elementwise-multiply', [v('x',[1,2,3]),v('v',[4,-1,2])]), [4,-2,6]));
  await t.test('dot product reduces to scalar', () => t.equal(evaluateOperation('dot-product', [v('x',[1,3]),v('v',[2,4])]), 14));
  await t.test('output shape preservation', () => t.deepEqual(computeOutputShape('vector-plus-scalar', [v('x',[1,2,3,4]),s('z',2)]), { semanticType:'column-vector',rows:4,columns:1,length:4,components:4 }));
  await t.test('operand types disambiguate multiply', () => t.equal(inferOperation(s('z',2),'*',v('x',[1,2])), 'scalar-times-vector'));
}
