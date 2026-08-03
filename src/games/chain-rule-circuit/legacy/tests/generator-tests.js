import {test,ok,equal} from './test-utils.js';
import {generateRound} from '../js/engine/question-generator.js';
import {validateGraph,findAllPaths} from '../js/math/computation-graph.js';
test('seeded generation is deterministic',()=>equal(generateRound(52917),generateRound(52917)));
test('2,000 generated circuit invariants',()=>{for(let seed=1;seed<=2000;seed+=1){const round=generateRound(seed);if(round.graph){ok(validateGraph(round.graph).valid,`seed ${seed} invalid`);const paths=findAllPaths(round.graph,round.inputId,round.outputId);equal(paths,round.expectedPaths,`seed ${seed} paths`);ok(round.graph.nodes.length<=8);ok(round.expectedPaths.length<=3);}if(round.taskType==='shape')ok(round.shapeBlocks[0].columns===round.shapeBlocks[1].rows);}});
