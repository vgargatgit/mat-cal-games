import {test,equal,ok} from './test-utils.js';
import {createGraph,topologicalOrder,validateGraph,findAllPaths} from '../js/math/computation-graph.js';
const nodes=['x','u','v','y'].map(id=>({id}));
const branch=createGraph(nodes,[{from:'x',to:'u'},{from:'x',to:'v'},{from:'u',to:'y'},{from:'v',to:'y'}]);
test('topological order places dependencies first',()=>{const order=topologicalOrder(branch);ok(order.indexOf('x')<order.indexOf('u'));ok(order.indexOf('u')<order.indexOf('y'));});
test('path discovery returns every branch',()=>equal(findAllPaths(branch,'x','y'),[['x','u','y'],['x','v','y']]));
test('cycle detection rejects cyclic graph',()=>{const cyclic=createGraph([{id:'a'},{id:'b'}],[{from:'a',to:'b'},{from:'b',to:'a'}]);equal(validateGraph(cyclic).valid,false);});
test('unknown edge node is rejected',()=>equal(validateGraph(createGraph([{id:'a'}],[{from:'a',to:'b'}])).valid,false));
