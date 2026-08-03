import {test,equal,ok} from './test-utils.js';
import {validateFinalAnswer,validateRound} from '../js/engine/answer-validator.js';
import {roundForLevel} from '../js/data/sample-rounds.js';

const edgeKey = edge => `${edge.from}->${edge.to}`;
const pathKey = path => path.join('>');

function completeSubmission(round) {
  return {
    assignments:[...(round.assignments ?? [])],
    connections:(round.graph?.edges ?? []).map(edgeKey),
    derivatives:(round.graph?.edges ?? []).map(edge => edge.localDerivative.expression),
    derivativeMap:Object.fromEntries((round.graph?.edges ?? []).map(edge => [edgeKey(edge), edge.localDerivative.expression])),
    paths:[...(round.expectedPaths ?? [])],
    pathProducts:Object.fromEntries((round.expectedPaths ?? []).map((path, index) => [pathKey(path), round.expectedProduct?.[index]])),
    factorOrder:(round.expectedPaths?.length ?? 0) <= 1 ? [...(round.expectedProduct ?? [])].filter(factor => factor !== round.incomingGradient) : [],
    productBuilt:true,
    accumulated:(round.expectedPaths?.length ?? 0) > 1,
    injectedGradient:Boolean(round.incomingGradient),
    finalAnswer:round.answer,
    explanation:'Multiply every serial route in output-to-input order and add separate route contributions.'
  };
}

test('accepts deterministic two-path derivative',()=>equal(validateFinalAnswer(roundForLevel(8),'2x+3').correct,true));
test('detects missing branch',()=>equal(validateFinalAnswer(roundForLevel(8),'2x').misconception,'missing-path'));
test('detects added serial derivatives',()=>equal(validateFinalAnswer(roundForLevel(4),'cos(u)+2x').misconception,'added-serial'));
test('detects omitted incoming gradient',()=>equal(validateFinalAnswer(roundForLevel(7),'dy/dx').misconception,'incoming-omitted'));
test('shape round validates exact result shape',()=>equal(validateFinalAnswer(roundForLevel(13),'2×4').correct,true));
test('complete submission requires every stage and every path',()=>{const round=roundForLevel(8);ok(validateRound(round,completeSubmission(round)).allCorrect);});
test('correct final formula does not hide a missing forward wire',()=>{const round=roundForLevel(8);const submission=completeSubmission(round);submission.connections.pop();const result=validateRound(round,submission);equal(result.allCorrect,false);equal(result.misconception,'graph-connection');});
test('correct final formula does not hide a wrong local derivative',()=>{const round=roundForLevel(5);const submission=completeSubmission(round);submission.derivativeMap['x->u']='x^2';const result=validateRound(round,submission);equal(result.allCorrect,false);equal(result.misconception,'wrong-local');});
