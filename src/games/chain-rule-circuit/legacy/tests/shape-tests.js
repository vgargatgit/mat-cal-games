import {test,equal,ok} from './test-utils.js';
import {validateChainShapes,multiplyMatrices,jacobianShape,vectorShape} from '../js/math/shape-model.js';
test('numerator-layout Jacobian shape is output by input',()=>equal(jacobianShape(vectorShape(2),vectorShape(4)),{rows:2,columns:4,semanticType:'matrix'}));
test('compatible shape chain yields outer dimensions',()=>equal(validateChainShapes([{rows:2,columns:3},{rows:3,columns:4}]).shape,{rows:2,columns:4,semanticType:'matrix'}));
test('shape mismatch is rejected',()=>ok(!validateChainShapes([{rows:2,columns:3},{rows:2,columns:4}]).valid));
test('ordered numerical Jacobian product',()=>equal(multiplyMatrices([[1,2],[0,3]],[[4,0],[5,1]]),[[14,2],[15,3]]));
