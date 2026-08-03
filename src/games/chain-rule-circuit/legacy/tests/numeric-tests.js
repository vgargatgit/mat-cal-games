import {test,near,equal} from './test-utils.js';
import {finiteDifference,computeForwardPass} from '../js/math/numeric-evaluator.js';
test('vector finite differences recover a row gradient',()=>{const gradient=finiteDifference(values=>values[0]*2+values[1]*3,[1,2]);near(gradient[0],2,1e-8);near(gradient[1],3,1e-8);});
test('broadcast then reduction numerical derivative is n',()=>near(finiteDifference(z=>[1+z,2+z,3+z].reduce((a,b)=>a+b,0),.4),3,1e-8));
test('forward graph evaluates in topological order',()=>{const graph={nodes:[{id:'x',role:'input'},{id:'u',role:'intermediate',operation:{type:'square'}},{id:'y',role:'output',operation:{type:'sin'}}],edges:[{from:'x',to:'u'},{from:'u',to:'y'}]};near(computeForwardPass(graph,{x:2}).y,Math.sin(4));});
test('ReLU convention is zero on boundary',()=>{const graph={nodes:[{id:'x',role:'input'},{id:'y',role:'output',operation:{type:'relu'}}],edges:[{from:'x',to:'y'}]};equal(computeForwardPass(graph,{x:0}).y,0);});
